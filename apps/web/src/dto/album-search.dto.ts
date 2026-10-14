import type { RefObject, Dispatch, SetStateAction } from 'react';
export interface AlbumSearch {
  searchOpen: boolean;
  query: string;
  draft: string;
  sort: string;
  creating: boolean;
  input: RefObject<HTMLInputElement | null>;
  trigger: RefObject<HTMLButtonElement | null>;
  startComposition: () => void;
  endComposition: (value: string) => void;
  changeDraft: (value: string) => void;
  setQuery: Dispatch<SetStateAction<string>>;
  setDraft: Dispatch<SetStateAction<string>>;
  setSort: Dispatch<SetStateAction<string>>;
  setCreating: Dispatch<SetStateAction<boolean>>;
  openSearch: () => void;
  closeSearch: () => void;
}
