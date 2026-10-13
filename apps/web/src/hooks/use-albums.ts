"use client";
import { useRef, useState } from "react";
import type { AlbumSearch } from "@/dto/album-search.dto";
export function useAlbumSearch(): AlbumSearch {
  const [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState(""),
    [sort, setSort] = useState("recent"),
    [creating, setCreating] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    composing = useRef(false);
  function openSearch() {
    setSearchOpen(true);
    requestAnimationFrame(() => input.current?.focus());
  }
  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setDraft("");
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return {
    searchOpen,
    query,
    draft,
    sort,
    creating,
    input,
    trigger,
    startComposition: () => {
      composing.current = true;
    },
    endComposition: (value: string) => {
      composing.current = false;
      setQuery(value);
    },
    changeDraft: (value: string) => {
      setDraft(value);
      if (!composing.current) setQuery(value);
    },
    setQuery,
    setDraft,
    setSort,
    setCreating,
    openSearch,
    closeSearch,
  };
}
