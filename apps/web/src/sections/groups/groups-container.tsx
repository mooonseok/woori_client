"use client";
import { useGroupManagement } from "@/hooks/use-group-management";
import { useGallery } from "@/hooks/use-gallery";
import { GroupsView } from "./groups-view";
function GroupContent() {
  const model = useGroupManagement();
  return <GroupsView {...model} />;
}
export function GroupsContainer() {
  const { groupId } = useGallery();
  return <GroupContent key={groupId} />;
}
