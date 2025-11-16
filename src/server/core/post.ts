import { context, reddit } from '@devvit/web/server';

export const createPost = async (imageUrls: Array<string>) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    subredditName: subredditName,
    runAs: 'USER',
    title: 'GEO DART',
    userGeneratedContent: {
      text: "images",
      imageUrls: imageUrls,
    }
  });
};
