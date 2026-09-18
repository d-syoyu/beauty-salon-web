'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const HERO_DESKTOP = '/full.png';
const HERO_MOBILE = '/full_for_mobile.png';
const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=2400&q=80';

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroImageScale = useTransform(scrollY, [0, 400], [1, 1.08]);
  const heroTextY = useTransform(scrollY, [0, 360], [0, -40]);

  const [desktopSrc, setDesktopSrc] = useState(HERO_DESKTOP);
  const [mobileSrc, setMobileSrc] = useState(HERO_MOBILE);

  return (
    <section
      ref={containerRef}
      className="relative isolate flex h-svh min-h-[640px] items-end overflow-hidden bg-[#f3eee6] md:items-center"
    >
      {/* === PHOTO: full-bleed so the seam never opens a gap === */}
      <motion.div style={{ scale: heroImageScale }} className="absolute inset-0 z-0">
        <div className="hero-ken-burns absolute inset-0">
          <Image
            src={desktopSrc}
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            priority
            sizes="100vw"
            onError={() => setDesktopSrc(HERO_FALLBACK)}
            className="hidden object-cover object-[62%_center] md:block"
          />
          <Image
            src={mobileSrc}
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            priority
            sizes="100vw"
            onError={() => setMobileSrc(HERO_FALLBACK)}
            className="object-cover object-center md:hidden"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#f3eee6] via-[#f3eee6]/45 to-transparent md:hidden" />
      </motion.div>

      {/* Solid beige column overlapping the photo — short fade, no empty strip */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-[min(42rem,46%)] md:block">
        <div className="absolute inset-0 bg-[#f3eee6]" />
        <div className="absolute inset-y-0 left-full w-12 bg-gradient-to-r from-[#f3eee6] to-transparent" />
      </div>
      <div className="hero-linen-field pointer-events-none absolute inset-0 z-[1] md:hidden" />
      <div className="hero-paper-grain pointer-events-none absolute inset-0 z-[1]" />

      <div className="pointer-events-none absolute inset-4 z-[2] border border-[var(--color-gold)]/25 md:inset-7 lg:inset-10" />

      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.2 }}
        className="pointer-events-none absolute left-[-0.08em] top-[18%] z-[1] hidden select-none font-[family-name:var(--font-serif)] text-[16rem] font-light italic leading-none text-[var(--color-gold)]/[0.07] lg:block xl:text-[18rem]"
      >
        L
      </motion.span>

      {/* === COPY === */}
      <motion.div
        style={{ y: heroTextY }}
        className="relative z-10 w-full px-6 pb-14 pt-28 md:px-12 md:pb-0 md:pt-16 lg:px-20"
      >
        <div className="mx-auto grid max-w-7xl md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-center">
          <div className="max-w-xl rounded-[2px] bg-[#f3eee6]/92 p-6 shadow-[0_20px_60px_rgba(90,85,80,0.06)] backdrop-blur-[8px] md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-6 flex items-center gap-4"
            >
              <span className="h-px w-10 bg-[var(--color-gold)]" />
              <p className="text-[10px] tracking-[0.42em] text-[var(--color-gold)] uppercase">
                Omotesando · Tokyo
              </p>
            </motion.div>

            <h1 className="mb-7">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="block font-jp-display text-[2.05rem] font-medium leading-[1.2] tracking-wide text-[var(--color-charcoal)] md:text-[3.15rem] lg:text-[3.85rem]"
              >
                あなたの美しさを
              </motion.span>
              <span className="hero-text-reveal mt-1 block font-jp-display text-[2.55rem] font-medium italic leading-[0.98] tracking-wide text-[var(--color-gold)] md:text-[4.2rem] lg:text-[5.25rem]">
                引き出す
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mb-9 max-w-sm text-sm font-light leading-relaxed tracking-wider text-[var(--color-warm-gray)] md:text-[0.95rem]"
            >
              自然由来の成分と熟練の技術で、
              <br className="hidden sm:block" />
              心と髪に優しいサロン体験を。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/reservation" className="btn-hero-primary">
                ご予約はこちら
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/menu" className="btn-hero-outline">
                メニューを見る
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Right-side caption on the photo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.2 }}
        className="absolute bottom-10 right-10 z-10 hidden max-w-[220px] border border-[var(--color-gold)]/35 bg-[#f3eee6]/90 p-5 backdrop-blur-md lg:block"
      >
        <p className="mb-2 text-[10px] tracking-[0.32em] text-[var(--color-gold)] uppercase">
          Private salon
        </p>
        <p className="font-[family-name:var(--font-serif)] text-base italic leading-snug text-[var(--color-charcoal)]">
          Organic care, crafted for you.
        </p>
        <p className="mt-3 text-[10px] tracking-[0.22em] text-[var(--color-warm-gray)] uppercase">
          表参道駅 徒歩3分 · 完全予約制
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 right-[12%] z-10 hidden flex-col items-center gap-2 md:flex"
      >
        <span className="text-[9px] font-light tracking-[0.38em] text-[var(--color-warm-gray)]/80 uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="h-8 w-px bg-gradient-to-b from-[var(--color-gold)]/70 to-transparent"
        />
      </motion.div>
    </section>
  );
}
