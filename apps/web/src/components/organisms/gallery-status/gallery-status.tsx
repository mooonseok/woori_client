'use client';
import { useState } from 'react';
import { useGallery } from '@/hooks/use-gallery';
import { useAuth } from '@/hooks/use-auth';
import { useCreateGroup } from '@/hooks/use-create-group';
import { Box, Heading, Text, Button } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
export function GalleryStatus() {
  const gallery = useGallery(),
    { user } = useAuth(),
    createGroup = useCreateGroup();
  const [creating, setCreating] = useState(false);
  const group = gallery.data.groups.find((g) => g.id === gallery.groupId);
  const verified = !!user?.emailVerified;
  if (gallery.loading)
    return (
      <Text className='state-panel' role='status'>
        사진 공간을 불러오고 있어요…
      </Text>
    );
  if (gallery.error)
    return (
      <Box className='state-panel'>
        <Heading>사진 공간을 불러오지 못했어요</Heading>
        <Text role='alert'>{gallery.error}</Text>
        <Button
          className='secondary-button'
          onClick={() => void gallery.reload()}
        >
          다시 시도
        </Button>
      </Box>
    );
  return (
    <Box className='welcome-panel'>
      <Icon name={group ? 'album' : 'users'} size={40} />
      <Heading>
        {group
          ? `${group.name}, 우리의 사진 공간`
          : '함께할 그룹을 만들어 보세요'}
      </Heading>
      <Text>
        {group
          ? `${group.members}명이 함께하고 있어요. 앨범에 사진을 담아 보세요.`
          : '그룹을 만들거나 전달받은 초대 코드로 참여해 보세요.'}
      </Text>
      {!verified && (
        <Box className='notice-panel'>
          <Text>그룹을 만들거나 참여하려면 이메일 확인이 필요해요.</Text>
          <Link className='text-button' href='/verify-email'>
            이메일 확인하기
          </Link>
        </Box>
      )}
      <Box className='inline-actions'>
        {group ? (
          <Link className='primary-button' href='/groups'>
            그룹 설정
          </Link>
        ) : (
          <Button
            className='primary-button'
            disabled={!verified}
            onClick={() => setCreating(true)}
          >
            그룹 만들기
          </Button>
        )}
        <Link className='secondary-button' href='/invite'>
          초대 코드 입력
        </Link>
      </Box>
      {creating && (
        <EntryDialog
          title='새 그룹 만들기'
          label='그룹 이름'
          maxLength={40}
          submitLabel='만들기'
          note='만든 그룹으로 바로 이동해요.'
          onSubmit={createGroup}
          onClose={() => setCreating(false)}
        />
      )}
    </Box>
  );
}
