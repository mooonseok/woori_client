"use client";
import { createContext, useContext, type ReactNode } from "react";
import { DEMO_MODE } from "@/constants/app-mode";
import { useAuth } from "@/hooks/use-auth";
import { useDemoGalleryState } from "@/hooks/use-demo-gallery";
import { useLiveGalleryState } from "@/hooks/use-live-gallery";
type GalleryStore = Omit<ReturnType<typeof useDemoGalleryState>, "mode"> & {
  mode: "demo" | "live";
};
const GalleryContext = createContext<GalleryStore | null>(null);
function DemoProvider({ children }: { children: ReactNode }) {
  const store = useDemoGalleryState();
  return (
    <GalleryContext.Provider value={store}>{children}</GalleryContext.Provider>
  );
}
function LiveProvider({ children }: { children: ReactNode }) {
  const store = useLiveGalleryState();
  return (
    <GalleryContext.Provider value={store}>{children}</GalleryContext.Provider>
  );
}
export function GalleryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return DEMO_MODE ? (
    <DemoProvider>{children}</DemoProvider>
  ) : (
    <LiveProvider key={user?.id || "anonymous"}>{children}</LiveProvider>
  );
}
export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("GalleryProvider required");
  return ctx;
}
