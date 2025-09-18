import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, PositionResponse, LeaderboardResponse, Leaderboard } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { media } from '@devvit/media';

import { pipeline } from "stream";
import { promisify } from "util";
import { buffer } from 'stream/consumers';
import { time } from 'console';

const app = express();

// Middleware for JSON body parsing
// Allow larger payloads, e.g. 10 MB
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);
      let [image0, image1, image2] = await redis.hMGet(postId, ['image0', 'image1', 'image2']);
      console.log("images: ", image0, image1, image2);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
        image0: image0 ?? '',
        image1: image1 ?? '',
        image2: image2 ?? '',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.get<{ postId: string }, LeaderboardResponse | { status: string; message: string }, unknown>(
  '/api/leaderboard',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    const userName = (await reddit.getCurrentUser())!.username;
    //const resp = (await redis.hGet(postId, userId))?.split(";");
    const timesPlayed = await redis.zCard(`${postId}_leaderboard`);
    console.log("times played: ", timesPlayed);
    const placeFromLast = await redis.zRank(`${postId}_leaderboard`, userName);
    console.log("place from last; ", placeFromLast);
    if (!placeFromLast || timesPlayed - placeFromLast < 12) {
      let data = await redis.zRange(`${postId}_leaderboard`, Math.max(timesPlayed - 12, 0), timesPlayed, {by: 'rank'});
      data = data.map((el) => ({...el, rank: 1}));
      let newData: Leaderboard[] = [];
      for (let i = Math.min(timesPlayed - 1, 11); i >= 0; i--) {
        newData.push({...data[i], rank: i + 1});
      }
      res.json({leaderboard: newData});
      return;
    }
    const place = timesPlayed - placeFromLast;
  }
);

router.get<{ postId: string }, { already_played: boolean } | PositionResponse | { status: string; message: string }, unknown>(
  '/api/already_played',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    const userId = (await reddit.getCurrentUser())!.id;
    const resp = (await redis.hGet(postId, userId))?.split(";");

    if (resp) {
      res.json({
        already_played: true,
      });
    } else {
      res.status(200).json({
        already_played: false,
      });
    }
  }
);

router.post<{ postId: string }, { seconds: number } | { status: string; message: string }, unknown>(
  '/api/submission_timestamp',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    const playTime = 60;
    const bufferTimer = 15;

    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    const userId = (await reddit.getCurrentUser())!.id;
    const timestamp = Date.now() + (playTime + bufferTimer) * 1000;
    // redis.hSet(postId, {[userId]: `;;;;${timestamp}`}); TODO: uncommented just for testing!

    res.json({ seconds: playTime });
  }
);

router.get<{ postId: string }, PositionResponse | { status: string; message: string }, unknown>(
  '/api/og_position',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    let [latitude, longitude] = await redis.hMGet(postId, ['latitude', 'longitude']);
    res.json({
      latitude: Number(latitude),
      longitude: Number(longitude),
      distance: 0,
      score: 0,
    });
  }
);

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

router.post<{ postId: string }, PositionResponse | { status: string; message: string }, { latitude: number; longitude: number }>(
  '/api/submit_dart_position',
  async (req, res): Promise<void> => {
    const { postId } = context;
    const {latitude, longitude} = req.body;

    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'Parameter not provided',
      });
      return;
    }

    const user = await reddit.getCurrentUser();
    const userId = user!.id;
    const [, , , , timestamp] = (await redis.hGet(postId, userId))?.split(";") ?? [];
    let [og_latitude, og_longitude] = await redis.hMGet(postId, ['latitude', 'longitude']);

    if (latitude == null || longitude == null) {
      res.status(200);
      redis.hSet(postId, {
        [userId]: `${latitude};${longitude};${0};${0};${timestamp}`,
      });

      res.json({
        latitude: Number(og_latitude),
        longitude: Number(og_longitude),
        distance: 0,
        score: 0,
      });
      return;
    }

    const distance = Math.round(haversineDistance(Number(og_latitude), Number(og_longitude), latitude, longitude) / 10) / 100;
    const score =  Math.ceil(Math.max(0, Math.round(3000 - distance)));
    
    if (Date.now() > Number(timestamp)) {
      res.status(400).json({
        status: 'error',
        message: 'Submitted after deadline :(',
      });
      redis.hSet(postId, {
        [userId]: `${latitude};${longitude};${distance};${0};${timestamp}`,
      });
      return;
    }

    redis.hSet(postId, {
      [userId]: `${latitude};${longitude};${distance};${score};${timestamp}`,
    });

    redis.zAdd(`${postId}_leaderboard`, 
      {member: user!.username, score: score},
    );

    res.json({
      latitude: Number(og_latitude),
      longitude: Number(og_longitude),
      distance: distance,
      score: score,
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost(['']);

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post<{}, { status: string; url: string } | { status: string; message: string }, 
  { imageURL0: string; imageURL1: string; imageURL2: string; splashImage: string; latitude: number; longitude: number }>(
  '/api/create_geo_dart',
  async (req, res): Promise<void> => {
    const { imageURL0, imageURL1, imageURL2, splashImage, latitude, longitude } = req.body;
    
    console.log("trying to create game");
    if (latitude == null || longitude == null || !imageURL0) {
      res.status(400).json({ status: 'error', message: 'Error. Missing parameters' });
      return;
    }

    const splashImageURL = await media.upload({
      url: splashImage,
      type: "image",
    });

    const post = await createPost(splashImageURL.mediaUrl, [splashImageURL.mediaUrl, imageURL0, imageURL1, imageURL2]);
    redis.hSet(post.id, {
      image0: imageURL0,
      image1: imageURL1,
      image2: imageURL2,
      latitude: String(latitude),
      longitude: String(longitude),
    });

    res.status(200).json({ status: 'ok', url: post.url });
  }
);

// promisify pipeline so we can await it
const streamPipeline = promisify(pipeline);

// Proxy OSM tiles: /osm/{z}/{x}/{y}.png
router.get("/api/osm/:z/:x/:y.png", async (req, res) => {
  const { z, x, y } = req.params;
  const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(url, { headers: {} });
    if (!response.ok) {
      res.status(response.status).send("Tile fetch error");
      return;
    }

    res.setHeader("Content-Type", "image/png");
    // Pipe the remote response body to the Express response
    await streamPipeline(response.body as any, res);
  } catch (err) {
    console.error("Error fetching OSM tile:", err);
    res.status(500).send("Internal proxy error");
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
