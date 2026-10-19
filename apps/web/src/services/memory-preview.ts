import type { MemoryCard } from '../dto/memories.dto.ts';

// Merge fresh metadata without overwriting a preview that changed while the
// list was loading. An in-flight retry retains its source identity until done.
export function reconcileMemoryPreviews(
  incoming: MemoryCard[],
  current: MemoryCard[],
  captured: MemoryCard[]
): MemoryCard[] {
  const latest = new Map(current.map((card) => [card.photo.id, card]));
  const before = new Map(captured.map((card) => [card.photo.id, card]));
  return incoming.map((card) => {
    const now = latest.get(card.photo.id);
    const old = before.get(card.photo.id);
    if (
      now &&
      (now.previewStatus === 'loading' ||
        now.thumbnail !== old?.thumbnail ||
        now.previewStatus !== old?.previewStatus)
    ) {
      return {
        ...card,
        thumbnail: now.thumbnail,
        previewStatus: now.previewStatus,
      };
    }
    return card;
  });
}

// Thumbnail retries belong to the visible card scope, not a single list fetch.
export class MemoryPreviewRequests {
  private requests = new Map<string, AbortController>();
  start(id: string) {
    this.cancel(id);
    const controller = new AbortController();
    this.requests.set(id, controller);
    return controller;
  }
  isCurrent(id: string, controller: AbortController) {
    return !controller.signal.aborted && this.requests.get(id) === controller;
  }
  finish(id: string, controller: AbortController) {
    if (this.requests.get(id) === controller) this.requests.delete(id);
  }
  cancel(id: string) {
    this.requests.get(id)?.abort();
    this.requests.delete(id);
  }
  cancelAll() {
    this.requests.forEach((controller) => controller.abort());
    this.requests.clear();
  }
}
