import Link from 'next/link';
import { Phone, ArrowRight } from 'lucide-react';
import ContactForm from '@/components/contact/ContactForm';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero */}
      <section className="container-wide pb-12">
        <div
          className="text-center"
          style={{ animation: 'fadeInUp 0.8s ease both' }}
        >
          <p className="text-subheading mb-4">Contact</p>
          <h1 className="text-display mb-6">お問い合わせ</h1>
          <div className="divider-line mx-auto mb-8" />
        </div>
      </section>

      {/* Reservation CTA */}
      <section className="container-wide pb-12">
        <div
          className="bg-gradient-to-r from-[var(--color-gold)]/10 to-[var(--color-gold-light)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ animation: 'fadeInUp 0.6s ease 0.2s both' }}
        >
          <div className="text-center md:text-left">
            <p className="text-lg font-[family-name:var(--font-serif)] text-[var(--color-charcoal)] mb-1">ご予約はオンラインで承ります</p>
            <p className="text-sm text-[var(--color-warm-gray)]">お電話でもご予約いただけます: 03-1234-5678</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/reservation"
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-white text-sm tracking-wider hover:shadow-[0_0_20px_rgba(184,149,110,0.3)] hover:-translate-y-0.5 transition-all"
            >
              オンライン予約
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:03-1234-5678"
              className="flex items-center gap-2 px-8 py-3 rounded-full border border-[var(--color-gold)] text-[var(--color-charcoal)] text-sm tracking-wider hover:bg-[var(--color-gold)] hover:text-white hover:shadow-[0_0_20px_rgba(184,149,110,0.3)] transition-all"
            >
              <Phone className="w-4 h-4" />
              電話予約
            </a>
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <ContactForm />
    </div>
  );
}
