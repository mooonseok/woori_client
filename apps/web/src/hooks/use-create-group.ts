'use client';
import { useRouter } from 'next/navigation';
import { useGallery } from '@/hooks/use-gallery';

// Creating a group selects it and lands on the home, where the start guide
// takes over (inviting people, the first album). Errors propagate to the
// caller's dialog or form.
export function useCreateGroup() {
  const gallery = useGallery(),
    router = useRouter();
  return async function createGroup(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const from = window.location.pathname;
    await gallery.createGroup(trimmed);
    gallery.setToast(`‘${trimmed}’ 그룹을 만들었어요.`);
    // Someone who navigated away meanwhile is not pulled back.
    if (window.location.pathname === from) router.push('/');
  };
}
