import express from 'express';
import { pipeline } from 'node:stream/promises';
import { InitResponse,
  IncrementResponse,
  DecrementResponse,
  PositionResponse,
  LeaderboardResponse,
  Leaderboard,
  SeasonLeaderboardResponse,
  UserGeoDartScore,
} from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { constructPersonalLeaderboard } from './leaderboard';
import { setUserScore } from './userScore';
import { setUserGeoDartResult, getUserGeoDartResult } from './databaseLayer';
import { getUserSubmissions } from './userSubmissions';

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

    const user = await reddit.getCurrentUser();
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const leaderboard = await constructPersonalLeaderboard(postId, user.username);
    res.json({leaderboard: leaderboard});
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
    const userScore = await getUserGeoDartResult(postId, userId);
    if (userScore != undefined) {
      res.status(400).json({
        status: 'error',
        message: 'Already played!',
      });
      return;
    }
    const timestamp = Date.now() + (playTime + bufferTimer) * 1000;
    const scoreObj: UserGeoDartScore = {
      longitude: null,
      latitude: null,
      distance: 0,
      score: 0,
      time: timestamp,
      redditorAvatar: ""
    };
    await setUserGeoDartResult(postId, userId, scoreObj);
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
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }
    
    let redditorAvatar = await user?.getSnoovatarUrl();
    if (redditorAvatar == undefined) {
      redditorAvatar = "";
    }

    const posResponse = await setUserScore(
      postId,
      user,
      user.id,
      latitude,
      longitude,
      redditorAvatar,
    );

    res.json(posResponse);
  }
);

router.get('/api/get_submissions', async (req, res) => {
  const { postId } = context;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const start_cursor = Number(req.query.cursor) || 0;
  const userName = (await reddit.getCurrentUser())!.username;
  const user = await reddit.getCurrentUser();
  const userId = user!.id;

  if (!postId) {
    return res.status(400).json({
      status: 'error',
      message: 'Parameter not provided'
    });
  }

  const geoDartResultObj = await getUserGeoDartResult(postId, userId);
  
  if (!geoDartResultObj?.time) {
    res.status(400).json({
      status: 'error',
      message: 'Did not submit yet!',
    });
    return;
  }
  return await getUserSubmissions(postId, userName, start_cursor, limit);
});

router.post('/internal/menu/create-leaderboard', async (_req, res): Promise<void> => {
  try {
    const post = await createPost([''], "Leaderboard", "leaderboard");
    const time_now = Date.now(); 
    const time_in_a_week = Date.now();
    const title = "Season Leaderboard";

    await redis.hSet("leaderboards", {
      // from; to
      [post.id]: `${title};${time_now};${time_in_a_week}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/on-delete', async (req, res): Promise<void> => {
  try {
    const postId: string = req.body.postId;
    const createdAt: Date|undefined = req.body.createdAt;
    const time_now = Date.now()
    const userScores = await redis.hGetAll(postId);
    // subtract points from leaderboard
    let leaderboards: Record<string,string> = await redis.hGetAll("leaderboards");
    Object.entries(userScores).forEach(async ([userID, value]) => {
      let [lat, long, dist, score, time, redditorAvatar] = value.split(";");
      if (userID.slice(0,3) == "t2_") {
        let user = await reddit.getUserById(userID as `t2_${string}`);
        Object.entries(leaderboards).forEach(async ([leaderboard_post_id, value]) => {
          let [, start, end] = value.split(";");
          const start_time = (new Date(start!)).getTime();
          const end_time = (new Date(end!)).getTime();
          if (time_now > start_time && time_now < end_time) {
            await redis.zIncrBy(leaderboard_post_id, user!.username, -score!);
          }
        });
      }
    });

  } catch (error) {
    console.error(`Error deleting post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to execute on-delete trigger',
    });
  }
});

router.put<{ postId: string }, null | { status: string; message: string }, { title: string, start: string, end: string}>(
  '/api/season-leaderboard', async (req, res): Promise<void> => {
  const subreddit_name = "GeoDart";
  const { postId } = context;
  const user = await reddit.getCurrentUser();
  const userPermission = await user!.getModPermissionsForSubreddit(subreddit_name);
  let { title, start, end } = req.body;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (userPermission) {
    await redis.hSet("leaderboards", {
      // from; to
      [postId!]: `${title};${startDate};${endDate}`,
    });
  }
  res.status(200).json({ status: 'ok', message: "ok" });
});

router.get<{ postId: string }, SeasonLeaderboardResponse | { status: string; message: string }, unknown>(
  '/api/season-leaderboard', async (_req, res): Promise<void> => {
  try {
    const subreddit_name = "GeoDart";
    const { postId } = context;
    const [title, start, end] = (await redis.hGet("leaderboards", postId!))!.split(";");
    const user = await reddit.getCurrentUser();
    const userName = user!.username;
    const userPermission = await user!.getModPermissionsForSubreddit(subreddit_name);
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'Error fetching season leaderboard. PostId was not provided.',
      });
      return;
    }
    let placeFromLast = await redis.zRank(postId!, userName);
    placeFromLast = placeFromLast? placeFromLast: 0;
    const leaderboard = await constructPersonalLeaderboard(postId, userName);
    res.json(
      {
        title: title!,
        start_timestamp: start!,
        end_timestamp: end!,
        leaderboard: leaderboard,
        userPermission: userPermission
      });
    return;
  } catch (error) {
    console.error(`Error fetching season leaderboard: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Error fetching season leaderboard',
    });
  }
  return;
});

router.post<{}, { status: string; url: string } | { status: string; message: string }, 
  { imageURL0: string; imageURL1: string; imageURL2: string; splashImage: string; latitude: number; longitude: number, title: string }>(
  '/api/create_geo_dart',
  async (req, res): Promise<void> => {
    let { imageURL0, imageURL1, imageURL2, splashImage, latitude, longitude, title } = req.body;
    const userName = (await reddit.getCurrentUser())!.username;

    if (latitude == null || longitude == null || !imageURL0) {
      res.status(400).json({ status: 'error', message: 'Error. Missing parameters' });
      return;
    }

    if (title == "") {
      title = `Can you find this place? GeoDart by ${userName}`;
    }

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
    await pipeline(response.body as any, res);
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
