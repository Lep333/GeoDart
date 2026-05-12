import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { Leaderboard } from '../shared/types/api';
import { timesPlayedGeoDart, userRankInGame, getLeaderboard, getSeasonalLeaderboards } from './databaseLayer';
import { getPostById } from './redditAPI';

export async function constructPersonalLeaderboard(postID: string, userName: string, isSeasonLeaderboard: boolean = false): Promise<Leaderboard[]> {
    postID = isSeasonLeaderboard? postID: `${postID}_leaderboard`;
    const timesPlayed = await timesPlayedGeoDart(postID);
    if (!timesPlayed) {
      return [];
    }
    let placeFromLast = await userRankInGame(postID, userName);
    const ownRank = timesPlayed - placeFromLast;
    
    if (ownRank <= 1000) {
      let data = await getLeaderboard(postID, Math.max(timesPlayed - 1, 0));
      const leaderboard = buildLeaderboard(data, userName);
      return leaderboard;
    } else {
      const upperRank = Math.min(ownRank + 950, timesPlayed - 1);
      let index = timesPlayed - upperRank;
      let data = await getLeaderboard(postID, Math.max(ownRank - 50, 0)); 
      const leaderboard = buildLeaderboard(data, userName, index);
      return leaderboard;
    }
}

function buildLeaderboard(data: {member: string, score: number}[], userName: string, startIndex: number = 1): Leaderboard[] {
    let newData: Leaderboard[] = [];
    let rank = 1;
    let prev_score = -1;
    data.reverse();
    data.forEach((el) => {
        if (el.score != prev_score) {
            rank = startIndex;
        }
        if (el.member == userName) {
            newData.push({...el, rank: rank, curr_user: true});
        } else {
            newData.push({...el, rank: rank, curr_user: false});
        }
        prev_score = el.score;
        startIndex++;
    });
    return newData;
}

export function eligableForSeasonalLeaderboard(time_now: number, start_time: number, end_time: number, postCreatedDate: number): boolean {
  return time_now > start_time && time_now < end_time && postCreatedDate > start_time && postCreatedDate < end_time;
}

export async function postingAddsToSeasonalLeaderboard(time_now: number, postID: `t3_${string}`): Promise<boolean> {
  // set season leaderboard
  let leaderboards: Record<string,string> = await getSeasonalLeaderboards();
  const post = await getPostById(postID);
  const postCreatedDate = post.createdAt.getTime();
  for (const [leaderboard_post_id, value] of Object.entries(leaderboards)) {
    let [, start, end] = value.split(";");
    const start_time = (new Date(start!)).getTime();
    const end_time = (new Date(end!)).getTime();
    if (eligableForSeasonalLeaderboard(time_now, start_time, end_time, postCreatedDate)) {
      return true;
    }
  };
  return false;
}