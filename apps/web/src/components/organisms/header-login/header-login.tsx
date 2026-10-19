'use client';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Link } from '@/components/molecules/link';
import { entryLoginDestination } from '@/utils/auth-navigation';
function HeaderLoginDestination() {
  const path = usePathname();
  const search = useSearchParams();
  return (
    <Link
      id='entry-login'
      className='ui-button ui-button--secondary'
      href={entryLoginDestination(path, search.toString())}
    >
      로그인
    </Link>
  );
}
export function HeaderLogin() {
  // Isolate query-dependent rendering: the surrounding static gallery stays
  // exportable, and direct links still have a usable loading fallback.
  return (
    <Suspense
      fallback={
        <Link
          id='entry-login'
          className='ui-button ui-button--secondary'
          href='/login'
        >
          로그인
        </Link>
      }
    >
      <HeaderLoginDestination />
    </Suspense>
  );
}
