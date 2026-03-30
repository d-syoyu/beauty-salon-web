import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import AnimatedSection from '@/components/AnimatedSection';
import StaffCards from '@/components/staff/StaffCards';

export default async function StaffPage() {
  const staffMembers = await prisma.staff.findMany({
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true } },
      menuAssignments: { select: { menuId: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });

  const staffData = staffMembers.map((s) => ({
    id: s.id,
    name: s.name,
    nameEn: s.nameEn,
    role: s.role,
    image: s.image,
    bio: s.bio,
    experience: s.experience,
    specialties: (() => { try { return JSON.parse(s.specialties ?? '[]') as string[]; } catch { return []; } })(),
    socialMedia: (() => { try { return JSON.parse(s.socialMedia ?? '{}') as Record<string, string>; } catch { return {}; } })(),
  }));

  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero */}
      <section className="container-wide pb-20">
        <div
          className="text-center"
          style={{ animation: 'fadeInUp 0.8s ease both' }}
        >
          <p className="text-subheading mb-4">Our Team</p>
          <h1 className="text-display mb-6">Staff</h1>
          <div className="divider-line mx-auto mb-8" />
          <p className="text-[var(--color-warm-gray)] max-w-lg mx-auto">
            経験豊富なスタイリストが<br />
            あなたの「なりたい」を叶えます
          </p>
        </div>
      </section>

      {/* Staff List */}
      <AnimatedSection className="pb-32" margin="-50px">
        <StaffCards staff={staffData} />
      </AnimatedSection>

      {/* Recruitment */}
      <section className="py-32 bg-[var(--color-cream-dark)]">
        <div className="container-narrow text-center">
          <p className="text-subheading mb-4">We are hiring</p>
          <h2 className="text-heading mb-6">スタッフ募集</h2>
          <div className="divider-line mx-auto mb-8" />
          <p className="text-[var(--color-warm-gray)] max-w-lg mx-auto mb-10">
            私たちと一緒に働きませんか？<br />
            経験者・未経験者問わず、やる気のある方を募集しています。
          </p>
          <Link href="/contact" className="btn-outline">
            お問い合わせ
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-[var(--color-charcoal)] text-white">
        <div className="container-narrow text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-sage-light)] mb-4">
            Reservation
          </p>
          <h2 className="text-heading text-white mb-6">
            ご予約をお待ちしております
          </h2>
          <div className="w-16 h-[1px] bg-[var(--color-gold)] mx-auto mb-8" />
          <p className="text-gray-400 mb-10">
            指名料は無料です。<br />
            お気軽にご希望のスタイリストをお伝えください。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[var(--color-gold)] text-white text-sm tracking-[0.2em] uppercase transition-all duration-500 hover:bg-[var(--color-gold)] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(184,149,110,0.3)]"
          >
            ご予約はこちら
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
