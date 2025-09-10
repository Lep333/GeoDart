import { GalleryMedia } from "@devvit/web/server";

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
  gallery: string;
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
