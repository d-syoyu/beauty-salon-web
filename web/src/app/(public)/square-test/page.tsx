import type { Metadata } from 'next';
import SquareSandboxDemo from '@/components/square/SquareSandboxDemo';

export const metadata: Metadata = {
  title: 'Square Test | LUMINA HAIR STUDIO',
  description: 'Square Web Payments SDK の Sandbox 表示確認用サンプルページです。',
};

export default function SquareTestPage() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-24 sm:pt-32">
      <div className="container-wide pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <SquareSandboxDemo />
        </div>
      </div>
    </div>
  );
}
