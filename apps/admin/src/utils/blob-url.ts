export interface BlobUrlApi {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
}
const browserApi: BlobUrlApi = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};
// Holds at most one object URL for viewed member content. Replacing or
// clearing it revokes the previous URL so no bytes outlive the viewer.
export function createBlobUrlSlot(api: BlobUrlApi = browserApi) {
  let current: string | null = null;
  let closed = false;
  return {
    // Returns null once closed: a late response must not create a URL.
    set(blob: Blob) {
      if (closed) return null;
      if (current) api.revoke(current);
      current = api.create(blob);
      return current;
    },
    clear() {
      if (current) api.revoke(current);
      current = null;
    },
    close() {
      closed = true;
      if (current) api.revoke(current);
      current = null;
    },
    current: () => current,
  };
}
