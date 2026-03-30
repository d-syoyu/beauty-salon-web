'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  // Track scroll of the viewport (not the section itself) to preserve parallax behavior
  const { scrollY } = useScroll();
  const heroImageScale = useTransform(scrollY, [0, 300], [1, 1.1]);
  const heroTextY = useTransform(scrollY, [0, 300], [0, -100]);
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen flex items-start pt-[22vh] md:pt-[18vh] overflow-hidden hero-noise"
    >
      {/* === BACKGROUND LAYERS === */}
      <motion.div style={{ scale: heroImageScale }} className="absolute inset-0 z-0">
        {/* Ken Burns animated background */}
        <div className="absolute inset-0 hero-ken-burns">
          {/* Desktop */}
          <Image
            src="/full.png"
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            className="object-cover object-center hidden md:block"
            priority
          />
          {/* Mobile */}
          <Image
            src="/full_for_mobile.png"
            alt="LUMINA HAIR STUDIO サロン内観"
            fill
            className="object-cover object-center md:hidden"
            priority
          />
        </div>

        {/* Multi-layer gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-cream)]/60 via-[var(--color-cream)]/20 to-[var(--color-cream)]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-cream)]/35 via-transparent to-transparent hidden md:block" />

        {/* Colored blur orbs */}
        <div className="absolute top-[15%] left-[5%] w-[250px] h-[250px] md:w-[450px] md:h-[450px] rounded-full bg-[var(--color-sage)] opacity-[0.07] blur-[80px] md:blur-[120px] hero-float-slow" />
        <div className="absolute bottom-[20%] right-[8%] w-[200px] h-[200px] md:w-[350px] md:h-[350px] rounded-full bg-[var(--color-gold)] opacity-[0.06] blur-[60px] md:blur-[100px] hero-float-slow-reverse" />

        {/* Spotlight glow */}
        <div
          className="absolute -top-[40%] -left-[20%] w-[80vw] h-[80vh] hero-spotlight hidden md:block"
          style={{
            background: 'radial-gradient(ellipse, rgba(184,149,110,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-cream)_85%)] opacity-40" />
      </motion.div>

      {/* === WATERMARK CHARACTER === */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.3 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:left-[30%] select-none pointer-events-none z-[1]"
        aria-hidden="true"
      >
        <span className="text-[18rem] md:text-[26rem] lg:text-[34rem] font-[family-name:var(--font-serif)] italic text-[var(--color-sage)] opacity-[0.03] leading-none">
          L
        </span>
      </motion.div>

      {/* === DECORATIVE FLOATING ELEMENTS (desktop only) === */}
      <div className="hidden md:block absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: 2, delay: 2.5 }}
          className="absolute top-[22%] right-[14%] w-24 h-24 lg:w-32 lg:h-32 rounded-full border border-[var(--color-gold)] hero-float-slow"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          transition={{ duration: 2, delay: 3 }}
          className="absolute top-[62%] left-[7%] w-2 h-2 rounded-full bg-[var(--color-sage)] hero-float-slow-reverse"
        />
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 0.08, scaleX: 1 }}
          transition={{ duration: 1.5, delay: 2 }}
          className="absolute top-[65%] right-[22%] w-28 h-[1px] bg-[var(--color-gold)] origin-right"
        />
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 0.06, scaleY: 1 }}
          transition={{ duration: 2, delay: 2.2 }}
          className="absolute top-[10%] right-[35%] w-[1px] h-40 bg-gradient-to-b from-transparent via-[var(--color-gold)] to-transparent origin-top rotate-[20deg]"
        />
      </div>

      {/* === MAIN TEXT CONTENT === */}
      <motion.div
        style={{ y: heroTextY, opacity: heroOpacity }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20"
      >
        <div className="text-center md:text-left md:max-w-xl lg:max-w-2xl">
          {/* Subheading with shimmer effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex items-center gap-3 mb-6 md:mb-8 justify-center md:justify-start"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="w-8 h-[1px] bg-white/60 md:bg-[var(--color-gold)] origin-left"
            />
            <p className="text-subheading hero-shimmer-text">LUMINA HAIR STUDIO</p>
          </motion.div>

          {/* Heading */}
          <h1 className="mb-6">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="block font-[family-name:var(--font-serif)] text-[2rem] md:text-[3rem] lg:text-[3.75rem] tracking-[-0.01em] text-[var(--color-charcoal)] leading-[1.1] mb-1 md:mb-2"
            >
              あなたの美しさを
            </motion.span>
            <span
              className="block font-[family-name:var(--font-serif)] italic text-[var(--color-charcoal)] text-[2.5rem] md:text-[4rem] lg:text-[5rem] leading-[0.95] tracking-tight hero-text-reveal"
            >
              引き出す
            </span>
          </h1>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="w-16 h-[1px] mb-8 md:mb-8 mx-auto md:mx-0 origin-center md:origin-left bg-gradient-to-r from-white/70 md:from-[var(--color-gold)] to-transparent md:to-[var(--color-gold-light)]/0"
          />

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="relative inline-block max-w-md mx-auto md:mx-0 mb-14 md:mb-16"
          >
            <div className="absolute -inset-4 bg-[var(--color-cream)]/75 blur-xl rounded-full md:hidden" />
            <p className="relative text-[var(--color-warm-gray)] font-light text-xs md:text-sm leading-relaxed">
              自然由来の成分と熟練の技術で<br />
              心と髪に優しいサロン体験を
            </p>
          </motion.div>

          {/* CTA accent dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.6 }}
            className="flex items-center gap-2 justify-center md:justify-start mb-6"
          >
            <div className="w-1 h-1 rounded-full bg-[var(--color-gold)] opacity-30" />
            <div className="w-1 h-1 rounded-full bg-[var(--color-gold)] opacity-60" />
            <div className="w-1 h-1 rounded-full bg-[var(--color-gold)] opacity-30" />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
          >
            <Link href="/reservation" className="btn-hero-primary">
              ご予約はこちら
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/menu" className="btn-hero-outline">
              メニューを見る
            </Link>
          </motion.div>
        </div>

        {/* Vertical decorative text - desktop only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 2.0 }}
          className="hidden lg:flex absolute right-0 xl:right-8 top-1/2 -translate-y-1/2 flex-col items-center gap-4"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent to-[var(--color-gold)]/30" />
          <span
            className="text-[10px] tracking-[0.4em] text-[var(--color-warm-gray)]/50 uppercase"
            style={{ writingMode: 'vertical-rl' }}
          >
            Since 2024
          </span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-[var(--color-gold)]/30 to-transparent" />
        </motion.div>
      </motion.div>

      {/* === SCROLL INDICATOR === */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-3"
      >
        <span className="text-[9px] tracking-[0.35em] text-[var(--color-warm-gray)]/70 uppercase font-light">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[1px] h-8 bg-gradient-to-b from-[var(--color-warm-gray)]/50 to-transparent"
        />
      </motion.div>
    </section>
  );
}
