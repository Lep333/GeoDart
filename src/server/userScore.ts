import { PositionResponse, UserGeoDartScore } from "../shared/types/api";
import { setUserGeoDartResult, getLatLng, setUserToLeaderboard, getUserGeoDartResult, getSeasonalLeaderboards, addPersonalScoreToSeasonalLeaderboard } from "./databaseLayer";
import { eligableForSeasonalLeaderboard } from "./leaderboard";
import { getPostById } from "./redditAPI";
import { User } from '@devvit/web/server';

export async function setUserScore(postID: string, user: User, userID: string,
  latitude: number, longitude: number, redditorAvatar: string): Promise<PositionResponse|undefined> {    
  const time_now = Date.now()
  const [og_latitude, og_longitude] = await getLatLng(postID);
  let geoDartScore = await getUserGeoDartResult(postID, userID);
  if (!geoDartScore) {
    return undefined;
  }
  geoDartScore.latitude = latitude;
  geoDartScore.longitude = longitude;
  geoDartScore.redditorAvatar = redditorAvatar;

  if (latitude == null || longitude == null) {
    await setUserGeoDartResult(postID, userID, geoDartScore);
    return {
      latitude: Number(og_latitude),
      longitude: Number(og_longitude),
      distance: 0,
      score: 0,
    };
  }

  if (time_now > Number(geoDartScore?.time)) {
    // TODO: res.status(400).json({
    //   status: 'error',
    //   message: 'Submitted after deadline :(',
    // });
    await setUserGeoDartResult(postID, userID, geoDartScore);
    return undefined;
  }

  const distance = Math.round(haversineDistance(
    Number(og_latitude),
    Number(og_longitude),
    geoDartScore.latitude,
    geoDartScore.longitude
  ) / 10) / 100;
  const score =  Math.ceil(Math.max(0, Math.round(3000 - distance)));

  await setUserGeoDartResult(postID, userID, geoDartScore);

  setUserToLeaderboard(postID, user.username, score);

  updatePersonalScoreOnSeasonLeaderboard(user, time_now, score, postID as `t3_${string}`);

  return {
    latitude: Number(og_latitude),
    longitude: Number(og_longitude),
    distance: distance,
    score: score,
  };
}

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

async function updatePersonalScoreOnSeasonLeaderboard(user: User, time_now: number, score: number, postID: `t3_${string}`) {
  // set season leaderboard
  let leaderboards: Record<string,string> = await getSeasonalLeaderboards();
  const post = await getPostById(postID);
  const postCreatedDate = post.createdAt.getTime();
  Object.entries(leaderboards).forEach(async ([leaderboard_post_id, value]) => {
    let [, start, end] = value.split(";");
    const start_time = (new Date(start!)).getTime();
    const end_time = (new Date(end!)).getTime();
    if (eligableForSeasonalLeaderboard(time_now, start_time, end_time, postCreatedDate)) {
      await addPersonalScoreToSeasonalLeaderboard(leaderboard_post_id, user.username, score);
    }
  });
}