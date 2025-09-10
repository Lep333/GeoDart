import { context, reddit } from '@devvit/web/server';

export const createPost = async (imageUrls: Array<string>) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'Find me if you can...',
      backgroundUri: imageUrls[0] ?? "no-img",
      buttonLabel: 'Lets try',
    },
    subredditName: subredditName,
    runAs: 'USER',
    title: 'GEO DART',
    userGeneratedContent: {
      text: "images",
      imageUrls: imageUrls,
    }
  });
};
