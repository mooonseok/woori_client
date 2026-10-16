export type MoreAttempt<T> =
  { superseded: true } | { superseded: false; value: T };

/**
 * A "더 보기" tap must not vanish when a refresh replaces the list while its
 * page is in flight: `attempt` reports `superseded`, then this waits for that
 * refresh to land and tries again with the cursor after its window. Still
 * superseded after `tries`, the caller tells the user to try again.
 */
export async function loadMoreAfterRefresh<T>(
  attempt: () => Promise<MoreAttempt<T>>,
  refreshed: () => Promise<unknown>,
  tries = 3
): Promise<MoreAttempt<T>> {
  for (let n = 0; n < tries; n++) {
    const result = await attempt();
    if (!result.superseded) return result;
    if (n < tries - 1) await refreshed().catch(() => {});
  }
  return { superseded: true };
}
