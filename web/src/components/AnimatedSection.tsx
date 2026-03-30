'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  margin?: string;
}

export default function AnimatedSection({
  children,
  className = '',
  margin = '-100px',
}: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    margin: margin as any,
  });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}
