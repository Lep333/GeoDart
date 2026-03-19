import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, PositionResponse, LeaderboardResponse, Leaderboard } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { media } from '@devvit/media';
import { Jimp } from "jimp";
import { pipeline } from "stream";
import { promisify } from "util";
import { buffer } from 'stream/consumers';
import { time } from 'console';
import { setHeapSnapshotNearHeapLimit } from 'v8';
import { start } from 'repl';
import { stat } from 'fs';

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
      let [image0, image1, image2, postAuthor] = await redis.hMGet(postId, ['image0', 'image1', 'image2', 'author']);
      // console.log("images: ", image0, image1, image2);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
        image0: image0 ?? '',
        image1: image1 ?? '',
        image2: image2 ?? '',
        author: postAuthor ?? '',
      });
      return;
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
    if (!timesPlayed) {
      res.json({leaderboard: []});
      return;
    }
    let placeFromLast = await redis.zRank(`${postId}_leaderboard`, userName);
    placeFromLast = placeFromLast? placeFromLast: 0;
    const ownRank = timesPlayed - placeFromLast!;
    let rank = 1;
    let prev_score = -1;
    if (ownRank <= 1000) {
      let data = await redis.zRange(`${postId}_leaderboard`, 0, Math.max(timesPlayed - 1, 0), {by: 'rank'});
      let newData: Leaderboard[] = [];
      let index = 1;
      data.reverse();
      data.forEach((el) => {
        if (el.score != prev_score) {
          rank = index;
        }
        if (el.member == userName) {
          newData.push({...el, rank: rank, curr_user: true});
        } else {
          newData.push({...el, rank: rank, curr_user: false});
        }
        prev_score = el.score;
        index++;
      });
      res.json({leaderboard: newData});
      return;
    } else {
      const upperRank = Math.min(ownRank + 950, timesPlayed - 1);
      let data = await redis.zRange(`${postId}_leaderboard`, Math.max(ownRank - 50, 0), upperRank, {by: 'rank'});
      let newData: Leaderboard[] = [];
      let index = timesPlayed - upperRank;
      data.reverse();
      data.forEach((el) => {
        if (el.score != prev_score) {
          rank = index;
        }
        if (el.member == userName) {
          newData.push({...el, rank: rank, curr_user: true});
        } else {
          newData.push({...el, rank: rank, curr_user: false});
        }
        prev_score = el.score;
        index++;
      });
      res.json({leaderboard: newData});
      return;
    }
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
    const author = await (await reddit.getPostById(postId)).getAuthor();
    if (userId == author?.id) {
      res.json({
        already_played: true,
      });
      return;
    }
    if (resp) {
      res.json({
        already_played: true,
      });
      return;
    } else {
      res.status(200).json({
        already_played: false,
      });
      return;
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
    const resp = (await redis.hGet(postId!, userId))?.split(";");
    if (resp) {
      res.status(400).json({
        status: 'error',
        message: 'Already played!',
      });
      return;
    }
    const timestamp = Date.now() + (playTime + bufferTimer) * 1000;
    await redis.hSet(postId, {[userId]: `null;null;0;0;${timestamp};""`});

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
    const user = await reddit.getCurrentUser();
    const userId = user!.id;
    const resp = (await redis.hGet(postId, userId))?.split(";");
    const time_now = Date.now()
    const redditorAvatar = await user?.getSnoovatarUrl();
    if (!resp) { // exploit detection
      await redis.hSet(postId, {
        [userId]: `${null};${null};${0};${0};${time_now};${redditorAvatar}`,
      });
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
    const redditorAvatar = await user?.getSnoovatarUrl();
    const [, , , , timestamp] = (await redis.hGet(postId, userId))?.split(";") ?? [];
    let [og_latitude, og_longitude] = await redis.hMGet(postId, ['latitude', 'longitude']);
    const time_now = Date.now()

    if (latitude == null || longitude == null) {
      res.status(200);
      await redis.hSet(postId, {
        [userId]: `${latitude};${longitude};${0};${0};${time_now};${redditorAvatar}`,
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
    
    if (time_now > Number(timestamp)) {
      res.status(400).json({
        status: 'error',
        message: 'Submitted after deadline :(',
      });
      await redis.hSet(postId, {
        [userId]: `${null};${null};${distance};${0};${time_now};${redditorAvatar}`, // TODO: this is completly wrong?
      });
      return;
    }

    await redis.hSet(postId, {
      [userId]: `${latitude};${longitude};${distance};${score};${time_now};${redditorAvatar}`,
    });

    await redis.zAdd(`${postId}_leaderboard`,
      {member: user!.username, score: score},
    );

    let leaderboards: Record<string,string> = await redis.hGetAll("leaderboards");
    Object.entries(leaderboards).forEach(async ([leaderboard_post_id, value]) => {
      let [start_time, end_time] = value.split(";")
      if (time_now > Number(start_time) && time_now < Number(end_time)) {
        let points = Number(await redis.hGet(leaderboard_post_id, userId)) + score;
        await redis.hSet(leaderboard_post_id, {
          [userId]: `${points}`,
        });
      }
    });
    res.json({
      latitude: Number(og_latitude),
      longitude: Number(og_longitude),
      distance: distance,
      score: score,
    });
  }
);

router.get('/api/get_submissions', async (req, res) => {
  const { postId } = context;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const start_cursor = Number(req.query.cursor) || 0;
  const userName = (await reddit.getCurrentUser())!.username;
  const user = await reddit.getCurrentUser();
  const userId = user!.id;
  const [, , , , timestamp] = (await redis.hGet(postId!, userId))?.split(";") ?? [];
  if (!postId) {
    return res.status(400).json({
      status: 'error',
      message: 'Parameter not provided'
    });
  }

  if (!timestamp) {
    res.status(400).json({
      status: 'error',
      message: 'Did not submit yet!',
    });
    return;
  }
  // FULL HSCAN LOOP
  let cursor = start_cursor;
  let fieldValues: { field: string; value: string }[] = [];
  do {
    const resp = await redis.hScan(postId, cursor);
    cursor = resp.cursor;
    fieldValues.push(...resp.fieldValues);
  } while (cursor !== 0 && fieldValues.length < limit);

  const promises = fieldValues.map(async (x) => {
    if (x.field.startsWith("t2_")) {
      let redditorUser;
      try {
        redditorUser = await reddit.getUserById(x.field as `t2_${string}`);
      } catch (err) {
        console.error("Failed to fetch user:", x.field, err);
        return null;
      }

      const redditorName = redditorUser?.username ?? "";
      if (!redditorName) {
        return null;
      }
      const values = x.value.split(";");

      let redditorAvatar;
      if (x.value.includes(",")) { // TODO: remove soonTM
        redditorAvatar = await redditorUser?.getSnoovatarUrl();
        const val = values[0];
        let [lat, long, distance, score, time, avatar] = val!.split(",");
        await redis.hSet(postId, {
          [x.field]: `${lat};${long};${distance};${score};${time};${redditorAvatar}`
        });
      } else {
        redditorAvatar = values[5];
      }

      return [
        redditorName,
        values[0],
        values[1],
        redditorAvatar,
        redditorName === userName
      ] as const;
    }

    return null;
  });
  const results: ScanResult[] = [];
  results.push(...(await Promise.all(promises))
    .filter((x): x is ScanResult => x !== null));
  res.json({items: results, nextCursor: cursor, hasMore: cursor!=0});
  }
);

router.post('/internal/menu/create-leaderboard', async (_req, res): Promise<void> => {
  try {
    const post = await createPost([''], "Leaderboard", "leaderboard");
    const user = await reddit.getCurrentUser();
    const userId = user!.id;
    const time_now = Date.now(); // TODO
    const time_in_a_week = time_now + 7*24*60*60*1000; // TODO

    await redis.hSet("leaderboards", {
        // from; to
        [post.id]: `${time_now};${time_in_a_week}`,
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
  { imageURL0: string; imageURL1: string; imageURL2: string; splashImage: string; latitude: number; longitude: number, title: string }>(
  '/api/create_geo_dart',
  async (req, res): Promise<void> => {
    let { imageURL0, imageURL1, imageURL2, splashImage, latitude, longitude, title } = req.body;
    const userName = (await reddit.getCurrentUser())!.username;
    //console.log("trying to create game");
    //console.log(imageURL0, imageURL1, imageURL2);

    if (latitude == null || longitude == null || !imageURL0) {
      res.status(400).json({ status: 'error', message: 'Error. Missing parameters' });
      return;
    }

    if (title == "") {
      title = `Can you find this place? GeoDart by ${userName}`;
    }
    // Load the image
    //const result = await blurImageFromURL(imageURL0);
    //console.log(result);

    // const splashImageURL = await media.upload({
    //   url: splashImage,
    //   type: "image",
    // });
    // const splashImageURL = await media.upload({
    //   url: `data:image/jpeg;base64,${result}`,
    //   type: "image",
    // });

    const post = await createPost([imageURL0, imageURL1, imageURL2], title, "default");
    await redis.hSet(post.id, {
      image0: imageURL0,
      image1: imageURL1,
      image2: imageURL2,
      latitude: String(latitude),
      longitude: String(longitude),
      title: title,
      author: userName,
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
