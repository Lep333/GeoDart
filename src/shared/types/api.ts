import type { ModeratorPermission } from '@devvit/public-api';

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
  image0: string;
  image1: string;
  image2: string;
  author: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type PositionResponse = {
  longitude: number;
  latitude: number;
  distance: number;
  score: number;
};

export type UserGeoDartScore = {
  longitude: number|null;
  latitude: number|null;
  distance: number;
  score: number;
  time: number;
  redditorAvatar: string;
};

export type SeasonLeaderboardResponse = {
  title: string;
  start_timestamp: string;
  end_timestamp: string;
  leaderboard: Leaderboard[];
  userPermission: ModeratorPermission[];
}

export type LeaderboardResponse = {
  leaderboard: Leaderboard[];
}

export type Leaderboard = {
  member?: string;
  score?: number;
  rank: number;
  curr_user: boolean;
}

export type UserGuessesResponse = {
  items: ScanResult[],
  nextCursor: number,
  hasMore: boolean,
}