'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { name: 'Menu', href: '/menu', nameJa: 'メニュー' },
  { name: 'Staff', href: '/staff', nameJa: 'スタッフ' },
  { name: 'News', href: '/blog', nameJa: 'お知らせ' },
  { name: 'Contact', href: '/contact', nameJa: 'お問い合わせ' },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#f3eee6]/95 py-2 shadow-sm backdrop-blur-md'
            : 'bg-[var(--color-cream)]/30 py-2 backdrop-blur-md'
        }`}
      >
        <div className="container-wide flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="group relative z-50"
          >
            <span className="font-[family-name:var(--font-serif)] text-base leading-none tracking-[0.15em] text-[var(--color-charcoal)] transition-colors duration-300 md:text-lg">
              LUMINA
            </span>
            <span className="mt-0.5 block text-[8px] leading-none tracking-[0.28em] text-[var(--color-warm-gray)] uppercase md:text-[9px] md:tracking-[0.3em]">
              HAIR STUDIO
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:block">
            <ul className="flex items-center gap-7 xl:gap-10">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="group relative text-[var(--color-charcoal)] transition-colors duration-300 hover:text-[var(--color-sage-dark)]"
                  >
                    <span className="text-xs tracking-[0.2em] uppercase">
                      {item.name}
                    </span>
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[var(--color-gold)] transition-all duration-300 group-hover:w-full" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/reservation"
                  className="ml-4 rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] px-5 py-1.5 text-[11px] tracking-[0.15em] text-white uppercase transition-all duration-300 hover:shadow-[0_0_20px_rgba(184,149,110,0.35)] hover:-translate-y-0.5"
                >
                  予約する
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mobile / Tablet actions */}
          <div className="relative z-50 flex items-center gap-2 xl:hidden">
            <Link
              href="/reservation"
              className="hidden rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] px-3.5 py-1.5 text-[10px] tracking-[0.16em] text-white uppercase sm:inline-flex"
            >
              予約する
            </Link>
            <button
              className="flex h-8 w-8 items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            >
              <div className="relative h-4 w-5">
                <motion.span
                  animate={{
                    top: mobileMenuOpen ? '50%' : '0%',
                    rotate: mobileMenuOpen ? 45 : 0,
                    translateY: mobileMenuOpen ? '-50%' : '0%',
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 h-[1.5px] w-full bg-[var(--color-charcoal)]"
                />
                <motion.span
                  animate={{
                    opacity: mobileMenuOpen ? 0 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-[var(--color-charcoal)]"
                />
                <motion.span
                  animate={{
                    bottom: mobileMenuOpen ? '50%' : '0%',
                    rotate: mobileMenuOpen ? -45 : 0,
                    translateY: mobileMenuOpen ? '50%' : '0%',
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-0 left-0 h-[1.5px] w-full bg-[var(--color-charcoal)]"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[var(--color-cream)] xl:hidden"
          >
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 -right-20 w-[300px] h-[300px] rounded-full bg-[var(--color-sage-light)] opacity-10 blur-3xl" />
              <div className="absolute bottom-1/4 -left-20 w-[250px] h-[250px] rounded-full bg-[var(--color-gold-light)] opacity-10 blur-3xl" />
            </div>

            <nav className="relative h-full flex flex-col items-center justify-center">
              <ul className="flex flex-col items-center gap-7 md:gap-8">
                {navItems.map((item, index) => (
                  <motion.li
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="group flex flex-col items-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="font-[family-name:var(--font-serif)] text-2xl text-[var(--color-charcoal)] transition-colors duration-300 group-hover:text-[var(--color-sage-dark)] md:text-3xl">
                        {item.nameJa}
                      </span>
                      <span className="mt-1 text-[10px] tracking-[0.3em] text-[var(--color-warm-gray)] uppercase md:text-xs">
                        {item.name}
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-10"
              >
                <Link
                  href="/reservation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] px-8 py-3.5 text-xs tracking-[0.18em] text-white uppercase"
                >
                  予約する
                </Link>
              </motion.div>

              {/* Contact info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.55 }}
                className="absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] text-center"
              >
                <p className="mb-2 text-xs tracking-[0.2em] text-[var(--color-warm-gray)]">
                  RESERVATION
                </p>
                <a
                  href="tel:03-1234-5678"
                  className="text-lg font-light tracking-wider text-[var(--color-charcoal)]"
                >
                  03-1234-5678
                </a>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
