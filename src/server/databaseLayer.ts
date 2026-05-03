import { redis, reddit, createServer, context, getServerPort, HScanResponse } from '@devvit/web/server';
import { UserGeoDartScore } from '../shared/types/api';

export async function timesPlayedGeoDart(postID: string): Promise<number> {
    return redis.zCard(`${postID}_leaderboard`);
}

export async function userRankInGame(postID: string, userName: string): Promise<number> {
    let placeFromLast = await redis.zRank(`${postID}_leaderboard`, userName);
    placeFromLast = placeFromLast? placeFromLast: 0;
    return placeFromLast;
}

export async function getLeaderboard(postID: string, startElement: number): Promise<{member: string, score: number}[]> {
    return redis.zRange(`${postID}_leaderboard`, 0, startElement, {by: 'rank'})
}

export async function setUserGeoDartResult(postID: string, userID: string, userScore: UserGeoDartScore) {
    return redis.hSet(postID, 
        {[userID]: `${userScore.latitude};${userScore.longitude};${userScore.distance};${userScore.score};${userScore.time};${userScore.redditorAvatar}`}
    );
}

export async function getUserGeoDartResult(postID: string, userID: string): Promise<UserGeoDartScore|undefined> {
    const userResult = await redis.hGet(postID!, userID);
    if (userResult == undefined) return undefined;

    const [lat, long, distance, score, time, avatar] = userResult!.split(";")
    return {
      longitude: Number(long),
      latitude: Number(lat),
      distance: Number(distance),
      score: Number(score),
      time: Number(time),
      redditorAvatar: String(avatar),
    };
}

export async function getLatLng(postID: string): Promise<(string|null)[]> {
    return redis.hMGet(postID, ['latitude', 'longitude']);
} 

export async function setUserToLeaderboard(postID: string, userName: string, score: number) {
    redis.zAdd(`${postID}_leaderboard`,
      {member: userName, score: score},
    );
}

export async function getSeasonalLeaderboards(): Promise<Record<string, string>> {
    return redis.hGetAll("leaderboards");
}

export async function addPersonalScoreToSeasonalLeaderboard(postID: string, userName: string, score: number) {
    redis.zIncrBy(postID, userName, score);
}

export async function scanRedis(postId: string, cursor: number): Promise<HScanResponse> {
    return redis.hScan(postId, cursor);
}