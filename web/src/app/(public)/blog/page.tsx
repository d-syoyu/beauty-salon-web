import { ArrowRight } from 'lucide-react';
import BlogCards from '@/components/blog/BlogCards';
import { newsPosts } from '@/data/blog-posts';

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero */}
      <section className="container-wide pb-20">
        <div
          className="text-center"
          style={{ animation: 'fadeInUp 0.8s ease both' }}
        >
          <p className="text-subheading mb-4">Information</p>
          <h1 className="text-display mb-6">News</h1>
          <div className="divider-line mx-auto mb-8" />
          <p className="text-[var(--color-warm-gray)] max-w-lg mx-auto">
            最新のお知らせやヘアケア情報、<br />
            トレンドスタイルをお届けします
          </p>
        </div>
      </section>

      {/* News List */}
      <BlogCards posts={newsPosts} />

      {/* CTA */}
      <section className="py-20 bg-[var(--color-cream-dark)]">
        <div className="container-narrow text-center">
          <p className="text-subheading mb-4">Follow Us</p>
          <h2 className="text-heading mb-6">最新情報をお届け</h2>
          <div className="divider-line mx-auto mb-8" />
          <p className="text-[var(--color-warm-gray)] max-w-lg mx-auto mb-10">
            Instagramでは、スタイル写真やサロンの日常を発信中。<br />
            ぜひフォローしてください。
          </p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Instagramをフォロー
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
