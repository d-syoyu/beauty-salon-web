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
  const heroImageScale = useTransform(scrollY, [0, 400], [1, 1.06]);
  const heroTextY = useTransform(scrollY, [0, 360], [0, -40]);

  const [desktopSrc, setDesktopSrc] = useState(HERO_DESKTOP);
  const [mobileSrc, setMobileSrc] = useState(HERO_MOBILE);

  return (
    <section
      ref={containerRef}
      className="relative isolate flex h-svh min-h-[640px] items-center overflow-hidden bg-[#f3eee6]"
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
            className="hidden object-cover object-[52%_38%] xl:block"
          />
          <Image
            src={mobileSrc}
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            priority
            sizes="100vw"
            onError={() => setMobileSrc(HERO_FALLBACK)}
            className="object-cover object-[center_46%] md:object-[center_44%] xl:hidden"
          />
        </div>
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f3eee6]/40 to-transparent md:h-28" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#f3eee6]/45 via-[#f3eee6]/12 to-transparent xl:hidden" />
      </motion.div>

      <div className="pointer-events-none absolute inset-3 z-[2] border border-[var(--color-gold)]/30 sm:inset-5 md:inset-7 xl:inset-10" />

      <motion.div
        style={{ y: heroTextY }}
        className="relative z-10 w-full px-5 pb-10 pt-20 sm:px-8 md:px-12 md:pb-12 lg:px-16 xl:px-20 xl:pb-0 xl:pt-16"
      >
        <div className="mx-auto max-w-7xl max-xl:portrait:flex max-xl:portrait:justify-center xl:block">
          <div className="max-w-[22rem] sm:max-w-md md:max-w-lg lg:max-w-xl max-xl:portrait:mx-auto max-xl:portrait:text-center xl:mx-0 xl:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-3 flex items-center gap-3 sm:mb-4 md:gap-4 max-xl:portrait:justify-center"
            >
              <span className="h-px w-7 bg-[var(--color-gold)] sm:w-10" />
              <p className="hero-outlined-sm text-[10px] tracking-[0.24em] uppercase sm:text-[11px] sm:tracking-[0.32em] md:text-xs lg:tracking-[0.38em]">
                <OutlinedText text="Omotesando · Tokyo" fillClassName="text-[var(--color-gold)]" />
              </p>
            </motion.div>

            <h1 className="hero-outlined-lg mb-4 overflow-visible font-jp-display font-medium tracking-wide sm:mb-5 md:mb-6">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="block text-[2.15rem] leading-[1.35] sm:text-[2.45rem] md:text-[3.1rem] lg:text-[3.55rem] xl:text-[3.85rem]"
              >
                <OutlinedText text="あなたの美しさを" />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="mt-1 block italic text-[2.7rem] leading-[1.2] sm:text-[3.15rem] md:text-[4rem] lg:text-[4.6rem] xl:text-[5.25rem]"
              >
                <OutlinedText text="引き出す" fillClassName="text-[var(--color-gold)]" />
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="hero-outlined-sm mb-6 max-w-[20rem] text-[15px] font-light leading-relaxed tracking-wider sm:mb-7 sm:max-w-md sm:text-base md:mb-8 md:text-[1.05rem] lg:text-[1.1rem] max-xl:portrait:mx-auto"
            >
              <OutlinedText text="自然由来の成分と熟練の技術で、" />
              <br />
              <OutlinedText text="心と髪に優しいサロン体験を。" />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.36 }}
              className="flex w-full flex-col items-stretch gap-3 md:flex-row md:items-center max-xl:portrait:justify-center"
            >
              <Link href="/reservation" className="btn-hero-primary w-full md:w-auto">
                ご予約はこちら
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/menu" className="btn-hero-outline w-full md:w-auto">
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
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 xl:flex"
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
