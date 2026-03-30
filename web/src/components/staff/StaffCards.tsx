'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { fadeInUp } from '@/lib/animation-variants';

interface StaffData {
  id: string;
  name: string;
  nameEn: string | null;
  role: string;
  image: string | null;
  bio: string | null;
  experience: string | null;
  specialties: string[];
  socialMedia: Record<string, string>;
}

interface StaffCardsProps {
  staff: StaffData[];
}

export default function StaffCards({ staff }: StaffCardsProps) {
  return (
    <div className="container-wide">
      <div className="space-y-32">
        {staff.map((member, index) => {
          const instagram = member.socialMedia.instagram || null;

          return (
            <motion.div
              key={member.id}
              variants={fadeInUp}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
            >
              {/* Image */}
              <div className={`relative ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                  {member.image ? (
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-serif text-[var(--color-sage)]">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className={`absolute w-32 h-32 bg-[var(--color-sage)] opacity-20 -z-10 ${
                  index % 2 === 0 ? '-bottom-6 -right-6' : '-bottom-6 -left-6'
                }`} />
              </div>

              {/* Content */}
              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <p className="text-xs tracking-[0.3em] text-[var(--color-sage)] uppercase mb-2">
                  {member.role}
                </p>
                <h2 className="text-4xl font-[family-name:var(--font-serif)] mb-1">
                  {member.name}
                </h2>
                <p className="text-sm text-[var(--color-warm-gray)] mb-6">
                  {member.nameEn}
                </p>
                <div className="divider-line mb-8" />

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs tracking-[0.2em] text-[var(--color-warm-gray)] uppercase mb-2">
                      Career
                    </p>
                    <p className="text-[var(--color-charcoal)]">{member.experience || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.2em] text-[var(--color-warm-gray)] uppercase mb-2">
                      Specialties
                    </p>
                    <p className="text-[var(--color-charcoal)]">
                      {member.specialties.join(' / ') || '-'}
                    </p>
                  </div>
                </div>

                {member.bio && (
                  <p className="text-[var(--color-warm-gray)] leading-relaxed mb-8">
                    {member.bio}
                  </p>
                )}

                {instagram && (
                  <a
                    href={`https://instagram.com/${instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--color-charcoal)] hover:text-[var(--color-sage)] transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="text-sm">{instagram}</span>
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
