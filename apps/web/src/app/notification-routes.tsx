'use client';
import { useRouter } from 'next/navigation';
import { NotificationsContainer } from '@/sections/notifications/notifications-container';
import { SettingsContainer } from '@/sections/settings/settings-container';
import { useGallery } from '@/hooks/use-gallery';
export function NotificationsRoute() {
  const router = useRouter(),
    { openPhoto, groupId, setGroupId } = useGallery();
  return (
    <NotificationsContainer
      onOpenPhoto={openPhoto}
      onOpenAlbum={(targetGroup, albumId) => {
        // The album screen lists the selected group; it pages to the album.
        if (targetGroup !== groupId) setGroupId(targetGroup);
        router.push(`/album?id=${encodeURIComponent(albumId)}`);
      }}
      onBack={() => router.push('/')}
      onSettings={() => router.push('/notification-settings')}
    />
  );
}
export function SettingsRoute() {
  const router = useRouter();
  const { data } = useGallery();
  return (
    <SettingsContainer
      groups={data.groups}
      onBack={() => router.push('/mypage')}
    />
  );
}
