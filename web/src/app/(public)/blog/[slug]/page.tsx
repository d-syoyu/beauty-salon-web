import Image from 'next/image';
import Link from 'next/link';
import { Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { newsPosts } from '@/data/blog-posts';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return newsPosts.map((p) => ({ slug: p.slug }));
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = newsPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] pt-32 pb-20">
        <div className="container-narrow text-center">
          <h1 className="text-heading mb-6">記事が見つかりません</h1>
          <Link href="/blog" className="btn-outline">
            <ArrowLeft className="w-4 h-4" />
            お知らせ一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero Image */}
      <div
        className="relative h-[50vh] min-h-[400px] animate-fade-in"
        style={{ animation: 'fadeIn 0.8s ease forwards' }}
      >
        <Image
          src={post.image}
          alt={post.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-cream)]" />
      </div>

      {/* Content */}
      <article className="container-narrow -mt-20 relative z-10 pb-20">
        <div
          className="bg-white p-8 md:p-12"
          style={{ animation: 'fadeInUp 0.8s ease 0.2s both' }}
        >
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            お知らせ一覧へ戻る
          </Link>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-[var(--color-cream)] text-xs tracking-[0.1em]">
              {post.category}
            </span>
            <div className="flex items-center gap-2 text-sm text-[var(--color-warm-gray)]">
              <Calendar className="w-4 h-4" />
              <time>{post.date}</time>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-serif)] mb-8">
            {post.title}
          </h1>

          <div className="w-16 h-[1px] bg-[var(--color-gold)] mb-8" />

          {/* Content */}
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-[family-name:var(--font-serif)]
              prose-headings:text-[var(--color-charcoal)]
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-[var(--color-warm-gray)] prose-p:leading-relaxed
              prose-ul:text-[var(--color-warm-gray)]
              prose-li:my-2
              prose-strong:text-[var(--color-charcoal)] prose-strong:font-medium"
            dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
          />
        </div>
      </article>

      {/* CTA */}
      <section className="py-20 bg-[var(--color-cream-dark)]">
        <div className="container-narrow text-center">
          <p className="text-subheading mb-4">Reservation</p>
          <h2 className="text-heading mb-6">ご予約をお待ちしております</h2>
          <div className="divider-line mx-auto mb-8" />
          <Link href="/contact" className="btn-primary">
            ご予約はこちら
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
