'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send, Check, ArrowRight } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
    setIsSubmitted(true);
  };

  const canSubmit = formData.name !== '' && formData.email !== '' && formData.message !== '';

  return (
    <div className="min-h-screen bg-[var(--color-cream)] pt-32">
      {/* Hero */}
      <section className="container-wide pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <p className="text-subheading mb-4">Contact</p>
          <h1 className="text-display mb-6">お問い合わせ</h1>
          <div className="divider-line mx-auto mb-8" />
        </motion.div>
      </section>

      {/* Reservation CTA */}
      <section className="container-wide pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-[var(--color-charcoal)] text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="text-center md:text-left">
            <p className="text-lg font-[family-name:var(--font-serif)] mb-1">ご予約はオンラインで承ります</p>
            <p className="text-sm text-gray-400">お電話でもご予約いただけます: 03-1234-5678</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/reservation"
              className="flex items-center gap-2 px-8 py-3 bg-[var(--color-sage)] text-white text-sm tracking-wider hover:bg-[var(--color-sage-dark)] transition-all"
            >
              オンライン予約
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:03-1234-5678"
              className="flex items-center gap-2 px-8 py-3 bg-white text-[var(--color-charcoal)] text-sm tracking-wider hover:bg-gray-100 transition-all"
            >
              <Phone className="w-4 h-4" />
              電話予約
            </a>
          </div>
        </motion.div>
      </section>

      <div className="container-wide pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white p-6 md:p-10"
            >
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-[var(--color-sage)] flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-[family-name:var(--font-serif)] mb-4">
                    お問い合わせありがとうございます
                  </h2>
                  <p className="text-[var(--color-warm-gray)] mb-2">
                    内容を確認後、担当者よりご連絡いたします。
                  </p>
                  <p className="text-sm text-[var(--color-warm-gray)] mb-8">
                    ※通常2営業日以内にご返信いたします。
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: '', email: '', phone: '', message: '' });
                    }}
                    className="btn-outline"
                  >
                    新しいお問い合わせ
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-[family-name:var(--font-serif)] mb-2 text-center">
                    お気軽にお問い合わせください
                  </h2>
                  <p className="text-sm text-[var(--color-warm-gray)] text-center mb-8">
                    ご質問やご相談など、以下のフォームよりお送りください
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        お名前 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all"
                        placeholder="山田 花子"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        メールアドレス <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all"
                        placeholder="example@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-2">
                        電話番号（任意）
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all"
                        placeholder="090-1234-5678"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium mb-2">
                        お問い合わせ内容 <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        required
                        className="w-full px-4 py-3 bg-[var(--color-cream)] border-2 border-transparent focus:border-[var(--color-sage)] outline-none transition-all resize-none"
                        placeholder="ご質問やご相談内容をご記入ください"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`flex items-center gap-2 px-10 py-4 text-sm tracking-wider transition-all ${
                          canSubmit
                            ? 'bg-[var(--color-charcoal)] text-white hover:bg-[var(--color-sage)]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        送信する
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/full.png"
                alt="LUMINA HAIR STUDIO サロン内装"
                fill
                className="object-cover"
              />
            </div>

            <div className="bg-white p-6">
              <h3 className="text-lg font-[family-name:var(--font-serif)] mb-4">サロン情報</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[var(--color-sage)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p>東京都渋谷区神宮前1-2-3</p>
                    <p className="text-[var(--color-warm-gray)]">表参道駅 A1出口より徒歩3分</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[var(--color-sage)] mt-0.5 flex-shrink-0" />
                  <a href="tel:03-1234-5678" className="hover:text-[var(--color-sage)] transition-colors">
                    03-1234-5678
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[var(--color-sage)] mt-0.5 flex-shrink-0" />
                  <a href="mailto:info@lumina-hair.jp" className="hover:text-[var(--color-sage)] transition-colors">
                    info@lumina-hair.jp
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[var(--color-sage)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p>平日 10:00 - 20:00</p>
                    <p>土日祝 9:00 - 19:00</p>
                    <p className="text-[var(--color-warm-gray)]">定休日: 毎週月曜日</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-cream-dark)] p-6 text-sm">
              <h4 className="font-medium mb-2">ご予約について</h4>
              <ul className="space-y-2 text-[var(--color-warm-gray)]">
                <li>・オンライン予約は<Link href="/reservation" className="text-[var(--color-sage)] underline">こちら</Link></li>
                <li>・当日予約はお電話にて承ります</li>
                <li>・キャンセルは前日までにご連絡ください</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
