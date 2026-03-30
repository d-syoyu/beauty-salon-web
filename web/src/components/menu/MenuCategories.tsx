'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import AnimatedSection from '@/components/AnimatedSection';
import { fadeInUp } from '@/lib/animation-variants';

interface MenuItem {
  name: string;
  price: string;
}

interface MenuCategory {
  id: string;
  title: string;
  titleJa: string;
  description: string;
  image: string;
  items: MenuItem[];
}

interface MenuCategoriesProps {
  categories: MenuCategory[];
}

export default function MenuCategories({ categories }: MenuCategoriesProps) {
  return (
    <>
      {categories.map((category, index) => (
        <AnimatedSection
          key={category.id}
          className={`py-20 ${index % 2 === 1 ? 'bg-[var(--color-cream-dark)]' : ''}`}
          margin="-50px"
        >
          <div className="container-wide">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Image */}
              <motion.div
                variants={fadeInUp}
                className={`relative ${index % 2 === 1 ? 'lg:order-2' : ''}`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.titleJa}
                    fill
                    className="object-cover"
                  />
                </div>
                {index % 2 === 0 && (
                  <div className="absolute -bottom-4 -right-4 w-full h-full border border-[var(--color-gold)] -z-10" />
                )}
                {index % 2 === 1 && (
                  <div className="absolute -bottom-4 -left-4 w-full h-full border border-[var(--color-sage)] -z-10" />
                )}
              </motion.div>

              {/* Content */}
              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <motion.p variants={fadeInUp} className="text-subheading mb-2">
                  {category.title}
                </motion.p>
                <motion.h2 variants={fadeInUp} className="text-heading mb-6">
                  {category.titleJa}
                </motion.h2>
                <motion.div variants={fadeInUp} className="divider-line mb-6" />
                <motion.p variants={fadeInUp} className="text-[var(--color-warm-gray)] mb-10 leading-relaxed">
                  {category.description}
                </motion.p>

                {/* Price List */}
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <motion.div
                      key={item.name}
                      variants={fadeInUp}
                      className="flex justify-between items-center py-3 border-b border-[var(--color-light-gray)]"
                    >
                      <span className="text-[var(--color-charcoal)]">{item.name}</span>
                      <span className="text-[var(--color-gold)] font-light text-lg">{item.price}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      ))}
    </>
  );
}
