import { scanRedis } from "./databaseLayer";
import { getUserById } from "./redditAPI";
import { UserGuessesResponse } from "../shared/types/api";

export async function getUserSubmissions(postID: string, currentUserName: string, startCursor: number, limit: number): Promise<UserGuessesResponse> {
  // FULL HSCAN LOOP
  let cursor = startCursor;
  let fieldValues: { field: string; value: string }[] = [];
  do {
    const resp = await scanRedis(postID, cursor);
    cursor = resp.cursor;
    fieldValues.push(...resp.fieldValues);
  } while (cursor !== 0 && fieldValues.length < limit);

  const promises = fieldValues.map(async (x) => {
    if (x.field.startsWith("t2_")) {
      let redditorUser;
      try {
        redditorUser = await getUserById(x);
      } catch (err) {
        console.error("Failed to fetch user:", x.field, err);
        return null;
      }

      const redditorName = redditorUser?.username ?? "";
      if (!redditorName) {
        return null;
      }
      const values = x.value.split(";");

      let redditorAvatar = values[5];

      return [
        redditorName,
        values[0],
        values[1],
        redditorAvatar,
        redditorName === currentUserName
      ] as const;
    }

    return null;
  });
  const results: ScanResult[] = [];
  results.push(...(await Promise.all(promises))
    .filter((x): x is ScanResult => x !== null));
  return {items: results, nextCursor: cursor, hasMore: cursor!=0};
}