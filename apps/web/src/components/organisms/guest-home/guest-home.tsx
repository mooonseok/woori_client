'use client';
import { useState } from 'react';
import { GuestHomeView } from '@/components/molecules/guest-home';
export function GuestHome({ next = '/' }: { next?: string }) {
  const [failures, setFailures] = useState([false, false, false]);
  const [attempts, setAttempts] = useState([0, 0, 0]);
  return (
    <GuestHomeView
      next={next}
      failures={failures}
      attempts={attempts}
      onImageError={(index) =>
        setFailures((current) =>
          current.map((failed, i) => (i === index ? true : failed))
        )
      }
      onImageRetry={(index) => {
        setFailures((current) =>
          current.map((failed, i) => (i === index ? false : failed))
        );
        setAttempts((current) =>
          current.map((attempt, i) => (i === index ? attempt + 1 : attempt))
        );
      }}
    />
  );
}
