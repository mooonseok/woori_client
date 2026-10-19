import type { PendingUpload } from '../dto/media.dto';

export interface UploadResult {
  failures: string[];
  files: File[];
}
interface AlbumUploads {
  pending: Map<File, PendingUpload>;
  failures: Map<File, { message: string; retryable: boolean }>;
  accepted: WeakSet<File>;
}

/** In-memory, provider-scoped files: never put names, signed URLs or files in storage. */
export class UploadRetention {
  private albums = new Map<string, AlbumUploads>();
  private album(id: string) {
    let value = this.albums.get(id);
    if (!value) {
      value = {
        pending: new Map(),
        failures: new Map(),
        accepted: new WeakSet(),
      };
      this.albums.set(id, value);
    }
    return value;
  }
  pending(id: string, file: File) {
    const album = this.album(id);
    let state = album.pending.get(file);
    if (!state) {
      state = { uploaded: false };
      album.pending.set(file, state);
    }
    return state;
  }
  accepted(id: string, file: File) {
    return this.album(id).accepted.has(file);
  }
  begin(id: string, files: File[]) {
    const album = this.album(id);
    // Starting another selection must not discard other failed files or tickets.
    files.forEach((file) => album.failures.delete(file));
  }
  accept(id: string, file: File) {
    const album = this.album(id);
    album.accepted.add(file);
    album.pending.delete(file);
    album.failures.delete(file);
  }
  fail(id: string, file: File, message: string, retryable = true) {
    const album = this.album(id);
    if (album.accepted.has(file)) return;
    album.failures.set(file, { message, retryable });
    if (!retryable) album.pending.delete(file);
  }
  result(id: string): UploadResult {
    const entries = [...(this.albums.get(id)?.failures.entries() ?? [])];
    return {
      failures: entries.map(([, failure]) => failure.message),
      files: entries
        .filter(([, failure]) => failure.retryable)
        .map(([file]) => file),
    };
  }
  remove(id: string) {
    this.albums.delete(id);
  }
  clear() {
    this.albums.clear();
  }
}
