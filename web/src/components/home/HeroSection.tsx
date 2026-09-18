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

function OutlinedText({
  text,
  className,
  fillClassName,
}: {
  text: string;
  className?: string;
  fillClassName?: string;
}) {
  return (
    <span className={className}>
      {Array.from(text).map((ch, index) => {
        const glyph = ch === ' ' ? '\u00A0' : ch;
        return (
          <span className="hero-glyph" key={`${index}-${ch}`}>
            <span className="hero-glyph-stroke" aria-hidden="true">
              {glyph}
            </span>
            <span className={`hero-glyph-fill ${fillClassName ?? ''}`}>{glyph}</span>
          </span>
        );
      })}
    </span>
  );
}

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
      <motion.div style={{ scale: heroImageScale }} className="absolute inset-0 z-0">
        <div className="hero-ken-burns absolute inset-0">
          <Image
            src={desktopSrc}
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            priority
            sizes="100vw"
            onError={() => setDesktopSrc(HERO_FALLBACK)}
            className="hidden object-cover object-[58%_center] md:block"
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
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#f3eee6]/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f3eee6]/40 to-transparent md:hidden" />
      </motion.div>

      <div className="pointer-events-none absolute inset-4 z-[2] border border-[var(--color-gold)]/30 md:inset-7 lg:inset-10" />

      <motion.div
        style={{ y: heroTextY }}
        className="relative z-10 w-full px-6 pb-14 pt-28 md:px-12 md:pb-0 md:pt-16 lg:px-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-6 flex items-center gap-4"
            >
              <span className="h-px w-10 bg-[var(--color-gold)]" />
              <p className="hero-outlined-sm text-[10px] tracking-[0.42em] uppercase">
                <OutlinedText text="Omotesando · Tokyo" fillClassName="text-[var(--color-gold)]" />
              </p>
            </motion.div>

            <h1 className="hero-outlined-lg mb-7 overflow-visible font-jp-display font-medium tracking-wide">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="block text-[2.05rem] leading-[1.35] md:text-[3.15rem] lg:text-[3.85rem]"
              >
                <OutlinedText text="あなたの美しさを" />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="mt-1 block italic text-[2.55rem] leading-[1.2] md:text-[4.2rem] lg:text-[5.25rem]"
              >
                <OutlinedText text="引き出す" fillClassName="text-[var(--color-gold)]" />
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="hero-outlined-sm mb-9 max-w-sm text-sm font-light leading-relaxed tracking-wider md:text-[0.95rem]"
            >
              <OutlinedText text="自然由来の成分と熟練の技術で、" />
              <br className="hidden sm:block" />
              <OutlinedText text="心と髪に優しいサロン体験を。" />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.36 }}
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[9px] font-light tracking-[0.38em] text-[var(--color-charcoal)]/55 uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="h-8 w-px bg-gradient-to-b from-[var(--color-gold)]/80 to-transparent"
        />
      </motion.div>
    </section>
  );
}
