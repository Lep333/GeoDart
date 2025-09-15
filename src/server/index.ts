import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, PositionResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { media } from '@devvit/media';

import { pipeline } from "stream";
import { promisify } from "util";
import { Console } from 'console';

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
      const [count, username, media] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
        redis.hGet(postId, 'image'),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
        gallery: media ?? 'empty',
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

    if (!postId || latitude == null || longitude == null) {
      res.status(400).json({
        status: 'error',
        message: 'Parameter not provided',
      });
      return;
    }

    let [og_latitude, og_longitude] = await redis.hMGet(postId, ['latitude', 'longitude']);
    const distance = Math.round(haversineDistance(Number(og_latitude), Number(og_longitude), latitude, longitude) / 10) / 100;
    const score =  Math.ceil(Math.max(0, Math.round(3000 - distance)));

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

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  res.json({
    showForm: {
      name: 'submitForm',
      form: {
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
          },
          {
            type: 'image',
            name: 'image',
            label: 'Image',
          },
          {
            type: 'number',
            name: 'latitude',
            label: 'Latitude',
          },
          {
            type: 'number',
            name: 'longitude',
            label: 'Longitude',
          },
        ],
      },
    },
  });
});

router.post('/internal/menu/post-submit', async (req, res): Promise<void> => {
  const { image, latitude, longitude } = req.body;
  console.log("neuer post bild ist hier am nuckeln", image);

  const post = await createPost([image]);
  redis.hSet(post.id, {
    image: image,
    latitude: String(latitude),
    longitude: String(longitude),
  });
});

router.post<{}, { status: string; message: string }, { imageURL: string; latitude: number; longitude: number }>(
  '/api/create_geo_dart',
  async (req, res): Promise<void> => {
    const { imageURL, latitude, longitude } = req.body;

    if (latitude == null || longitude == null || !imageURL) {
      res.status(400).json({ status: 'error', message: 'Error. Missing parameters' });
      return;
    }

    const post = await createPost([imageURL]);
    redis.hSet(post.id, {
      image: imageURL,
      latitude: String(latitude),
      longitude: String(longitude),
    });
    res.status(200).json({ status: 'ok', message: 'Geo Dart created' });
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
