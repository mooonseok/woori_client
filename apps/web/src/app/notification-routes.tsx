"use client";
import { useRouter } from "next/navigation";
import { NotificationsContainer } from "@/sections/notifications/notifications-container";
import { SettingsContainer } from "@/sections/settings/settings-container";
import { useGallery } from "@/hooks/use-gallery";
export function NotificationsRoute() {
  const router = useRouter(),
    { openPhoto } = useGallery();
  return (
    <NotificationsContainer
      onOpenPhoto={openPhoto}
      onBack={() => router.push("/")}
      onSettings={() => router.push("/notification-settings")}
    />
  );
}
export function SettingsRoute() {
  const router = useRouter();
  const { data } = useGallery();
  return (
    <SettingsContainer
      groups={data.groups}
      onBack={() => router.push("/mypage")}
    />
  );
}
