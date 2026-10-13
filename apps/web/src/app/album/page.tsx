import { Suspense } from "react";
import { AlbumContainer } from "@/sections/album/album-container";
export default function Page() {
  return (
    <Suspense>
      <AlbumContainer />
    </Suspense>
  );
}
