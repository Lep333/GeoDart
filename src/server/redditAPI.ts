import { redis, reddit, createServer, context, getServerPort, User } from '@devvit/web/server';

export async function getUserById(x: {field: string, value: string} ): Promise<User|undefined> {
    return reddit.getUserById(x.field as `t2_${string}`);
}