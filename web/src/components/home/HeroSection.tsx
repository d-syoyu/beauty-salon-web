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
  const heroImageScale = useTransform(scrollY, [0, 400], [1, 1.12]);
  const heroTextY = useTransform(scrollY, [0, 360], [0, -56]);
  const heroOpacity = useTransform(scrollY, [0, 280], [1, 0]);

  const [desktopSrc, setDesktopSrc] = useState(HERO_DESKTOP);
  const [mobileSrc, setMobileSrc] = useState(HERO_MOBILE);

  return (
    <section
      ref={containerRef}
      className="relative isolate flex h-svh min-h-[640px] items-end overflow-hidden bg-[#161210] text-[var(--color-cream)] md:items-center"
    >
      {/* === BACKGROUND === */}
      <motion.div style={{ scale: heroImageScale }} className="absolute inset-0 z-0">
        <div className="hero-ken-burns absolute inset-0">
          <Image
            src={desktopSrc}
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            priority
            sizes="100vw"
            onError={() => setDesktopSrc(HERO_FALLBACK)}
            className="hidden object-cover object-[68%_center] md:block"
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

        {/* Cinematic color grade — dark, not cream */}
        <div className="hero-cinematic-grade absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#120e0c] via-[#120e0c]/25 to-transparent md:via-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#120e0c]/70 to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#120e0c]/88 via-[#120e0c]/45 to-[#120e0c]/20 md:block" />

        <div className="absolute -left-[10%] top-[18%] h-[420px] w-[420px] rounded-full bg-[var(--color-gold)]/12 blur-[140px] hero-float-slow" />
        <div className="absolute bottom-[8%] right-[4%] h-[280px] w-[280px] rounded-full bg-[var(--color-sage)]/10 blur-[120px] hero-float-slow-reverse" />
      </motion.div>

      {/* Grain + editorial frame */}
      <div className="hero-film-grain pointer-events-none absolute inset-0 z-[1]" />
      <div className="pointer-events-none absolute inset-4 z-[2] border border-[var(--color-gold)]/20 md:inset-7 lg:inset-10" />

      {/* Oversized watermark */}
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, delay: 0.2 }}
        className="pointer-events-none absolute -right-6 top-[12%] z-[1] hidden select-none font-[family-name:var(--font-serif)] text-[18rem] font-light italic leading-none text-white/[0.04] lg:block xl:text-[22rem]"
      >
        Lumina
      </motion.span>

      {/* === COPY === */}
      <motion.div
        style={{ y: heroTextY, opacity: heroOpacity }}
        className="relative z-10 w-full px-6 pb-16 pt-28 md:px-12 md:pb-0 md:pt-16 lg:px-20"
      >
        <div className="mx-auto grid max-w-7xl items-end gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center lg:gap-16">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mb-7 flex items-center gap-4"
            >
              <span className="h-px w-10 origin-left bg-[var(--color-gold)]" />
              <p className="text-[10px] tracking-[0.42em] text-[var(--color-gold-light)] uppercase">
                Omotesando · Tokyo
              </p>
            </motion.div>

            <h1 className="mb-8">
              <motion.span
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="block font-jp-display text-[2.15rem] font-medium leading-[1.15] tracking-wide text-[var(--color-cream)] md:text-[3.4rem] lg:text-[4.25rem]"
              >
                あなたの美しさを
              </motion.span>
              <span className="hero-text-reveal mt-1 block font-jp-display text-[2.7rem] font-medium italic leading-[0.95] tracking-wide text-[var(--color-gold-light)] md:text-[4.6rem] lg:text-[6rem]">
                引き出す
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.05 }}
              className="mb-10 max-w-sm text-sm font-light leading-relaxed tracking-wider text-[var(--color-cream)]/72 md:text-[0.95rem]"
            >
              自然由来の成分と熟練の技術で、
              <br className="hidden sm:block" />
              心と髪に優しいサロン体験を。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.25 }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/reservation" className="btn-hero-primary">
                ご予約はこちら
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/menu" className="btn-hero-ghost">
                メニューを見る
              </Link>
            </motion.div>
          </div>

          {/* Right-side editorial meta — desktop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="hidden justify-self-end md:flex md:flex-col md:items-end md:gap-8"
          >
            <div className="max-w-[220px] border-l border-[var(--color-gold)]/35 pl-6 text-right">
              <p className="mb-2 text-[10px] tracking-[0.32em] text-[var(--color-gold-light)]/80 uppercase">
                Private salon
              </p>
              <p className="font-[family-name:var(--font-serif)] text-lg italic leading-snug text-[var(--color-cream)]/85">
                Organic care,
                <br />
                crafted for you.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] tracking-[0.28em] text-[var(--color-cream)]/45 uppercase">
              <span>完全予約制</span>
              <span className="h-px w-6 bg-[var(--color-gold)]/40" />
              <span>火定休</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Vertical signature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, delay: 1.6 }}
        className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-4 lg:right-12 lg:flex"
      >
        <div className="h-16 w-px bg-gradient-to-b from-transparent to-[var(--color-gold)]/45" />
        <span
          className="text-[10px] tracking-[0.42em] text-[var(--color-cream)]/50 uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          Since 2024
        </span>
        <div className="h-16 w-px bg-gradient-to-b from-[var(--color-gold)]/45 to-transparent" />
      </motion.div>

      {/* Bottom rail */}
      <div className="absolute inset-x-0 bottom-0 z-10 hidden items-end justify-between px-12 pb-8 lg:flex lg:px-20">
        <p className="text-[10px] tracking-[0.28em] text-[var(--color-cream)]/40 uppercase">
          表参道駅 A1出口 徒歩3分
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[9px] font-light tracking-[0.38em] text-[var(--color-cream)]/55 uppercase">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="h-8 w-px bg-gradient-to-b from-[var(--color-cream)]/55 to-transparent"
          />
        </motion.div>
      </div>
    </section>
  );
}
