'use client';

import dynamic from 'next/dynamic';
import type { ToasterProps } from 'sonner';

const DeferredToaster = dynamic(
  () => import('@/components/ui/sonner').then((module) => module.Toaster),
);

export function AdminToaster(props: ToasterProps) {
  return <DeferredToaster {...props} />;
}
