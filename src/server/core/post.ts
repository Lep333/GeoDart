import { context, reddit } from '@devvit/web/server';

export const createPost = async (imageUrls: List<String>) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }
  console.log(imageUrls)
  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'Find me if you can...',
      backgroundUri: imageUrls[0],
      buttonLabel: 'Lets try',
    },
    subredditName: subredditName,
    runAs: 'USER',
    title: 'find-me-app',
    userGeneratedContent: {
      text: "images",
      imageUrls: imageUrls,
    }
  });
};
