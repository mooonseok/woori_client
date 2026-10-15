import type { Photo } from '@/dto/album.dto';
export async function readPhotoPreview(
  file: File,
  albumId: string
): Promise<Photo> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error(
      'JPEG, PNG, WebP 사진을 선택해 주세요. HEIC는 JPG로 변환해 주세요.'
    );
  if (file.size > 20 * 1024 * 1024)
    throw new Error('사진 한 장은 20MB 이하로 선택해 주세요.');
  const src = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = src;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 60_000_000)
      throw new Error('해상도가 너무 큰 사진이에요.');
    return {
      id: crypto.randomUUID(),
      albumId,
      src,
      width: image.naturalWidth,
      height: image.naturalHeight,
      alt: file.name,
      capturedAt: new Date().toISOString().slice(0, 10),
      authorId: 'me',
    };
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}
