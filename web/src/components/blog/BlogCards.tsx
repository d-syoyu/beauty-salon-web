'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import AnimatedSection from '@/components/AnimatedSection';
import { fadeInUp } from '@/lib/animation-variants';
import type { BlogPost } from '@/data/blog-posts';

interface BlogCardsProps {
  posts: BlogPost[];
}

export default function BlogCards({ posts }: BlogCardsProps) {
  return (
    <AnimatedSection className="pb-32" margin="-50px">
      <div className="container-wide">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <motion.article
              key={post.slug}
              variants={fadeInUp}
              className="group"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden mb-6">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 text-xs tracking-[0.1em] text-[var(--color-charcoal)]">
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex items-center gap-2 text-[var(--color-warm-gray)] text-sm mb-3">
                  <Calendar className="w-4 h-4" />
                  <time>{post.date}</time>
                </div>

                <h2 className="text-xl font-[family-name:var(--font-serif)] mb-3 group-hover:text-[var(--color-sage-dark)] transition-colors">
                  {post.title}
                </h2>

                <p className="text-sm text-[var(--color-warm-gray)] leading-relaxed mb-4">
                  {post.excerpt}
                </p>

                <span className="inline-flex items-center gap-2 text-sm text-[var(--color-charcoal)] group-hover:text-[var(--color-sage)] transition-colors">
                  続きを読む
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
