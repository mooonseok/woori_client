// Identity transitions fence delayed mutations. A 401 from the just-revoked
// session clears private UI, but is not a different identity transition.
export function createCredentialChanges(cleanup: () => Promise<void>) {
  let revision = 0;
  let pendingCleanup = Promise.resolve();
  let pendingMutation = Promise.resolve();
  return {
    identityChanged: () => {
      revision++;
    },
    waitForCleanup: async () => {
      // Wait for Set-Cookie on the credential response as well as browser
      // cleanup; a late revoked-session cookie must not erase a new login.
      await pendingMutation;
      await pendingCleanup;
    },
    run(action: () => Promise<void>, apply: () => void) {
      const current = revision;
      const mutation = (async () => {
        await action();
        if (current !== revision)
          throw new Error('계정 상태가 바뀌었어요. 다시 확인해 주세요.');
        revision++;
        pendingCleanup = cleanup().catch(() => undefined);
        apply();
        await pendingCleanup;
      })();
      pendingMutation = mutation.catch(() => undefined);
      return mutation;
    },
  };
}
