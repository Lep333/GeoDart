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

export type LeaderboardResponse = {
  leaderboard: Leaderboard[];
}

export type Leaderboard = {
  member?: string;
  score?: number;
  rank: number;
  curr_user: boolean;
}