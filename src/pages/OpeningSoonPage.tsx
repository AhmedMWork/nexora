import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, Clock, Instagram, Mail, MessageCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { useI18n } from '@/i18n/I18nProvider';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { normalizeLaunchSettings } from '@/lib/launchMode';
import type { SiteSettings } from '@/types';

type Remaining = { days: number; hours: number; minutes: number; seconds: number; ended: boolean };

function getRemaining(target?: string): Remaining {
  const targetMs = target ? new Date(target).getTime() : Date.now();
  const diff = Math.max(0, targetMs - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    ended: diff <= 0,
  };
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[22px] border border-[#E4D6C5] bg-[#FFFDF8]/82 p-3 text-center shadow-[0_14px_40px_rgba(43,33,29,.08)] backdrop-blur-xl sm:rounded-[28px] sm:p-5">
      <motion.div
        key={value}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24 }}
        className="text-2xl font-black tracking-[-0.05em] text-[#231916] sm:text-5xl"
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#8C634B] sm:text-[10px]">{label}</div>
    </div>
  );
}

export default function OpeningSoonPage({ settings }: { settings?: SiteSettings | null }) {
  const { lang } = useI18n();
  const launch = useMemo(() => normalizeLaunchSettings(settings?.launchSettings || null), [settings?.launchSettings]);
  const [remaining, setRemaining] = useState(() => getRemaining(launch.launchAt));
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining(launch.launchAt)), 1000);
    return () => window.clearInterval(timer);
  }, [launch.launchAt]);

  useEffect(() => {
    if (remaining.ended && launch.autoOpen) window.location.replace('/');
  }, [remaining.ended, launch.autoOpen]);

  const copy = useMemo(() => {
    const isAr = lang === 'ar';
    return {
      eyebrow: launch.eyebrow || (isAr ? 'تجربة NEXORA الجديدة' : 'Premium launch experience'),
      title: launch.title || (isAr ? 'NEXORA تفتح قريبًا' : 'NEXORA is Opening Soon'),
      subtitle: launch.subtitle || (isAr ? 'نجهز لك تجربة تسوق أكثر فخامة وسلاسة.' : 'A new premium shopping experience is almost here.'),
      announcement: launch.announcement || (isAr ? 'إطلاق جديد، منتجات جديدة، وتجربة أفضل قريبًا.' : 'New drops, smoother checkout, and a better shopping journey are coming soon.'),
      days: isAr ? 'يوم' : 'Days',
      hours: isAr ? 'ساعة' : 'Hours',
      minutes: isAr ? 'دقيقة' : 'Minutes',
      seconds: isAr ? 'ثانية' : 'Seconds',
      notifyTitle: isAr ? 'كن أول من يعرف' : 'Be first to know',
      notifyText: isAr ? 'اترك بياناتك وسنخبرك عند الافتتاح.' : 'Leave your details and we will notify you when NEXORA opens.',
      name: isAr ? 'الاسم' : 'Name',
      contact: isAr ? 'الهاتف أو البريد الإلكتروني' : 'Phone or email',
      submit: isAr ? 'أبلغني عند الافتتاح' : 'Notify me at launch',
      whatsapp: launch.buttonText || (isAr ? 'تواصل معنا على واتساب' : 'Contact us on WhatsApp'),
      success: launch.notifySuccessMessage || (isAr ? 'تم تسجيلك في قائمة الافتتاح.' : 'You are on the launch list.'),
    };
  }, [lang, launch]);

  const whatsappUrl = buildWhatsAppUrl(settings?.whatsappNumber || '201037141322', launch.whatsappMessage || (lang === 'ar' ? 'مرحبًا NEXORA، أريد معرفة المزيد عن الافتتاح.' : 'Hello NEXORA, I would like to know more about the launch.'));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contact.trim()) return toast.error(lang === 'ar' ? 'اكتب رقم الهاتف أو البريد الإلكتروني.' : 'Enter your phone or email.');
    setSubmitting(true);
    try {
      const { submitLaunchSubscriber } = await import('@/lib/supabase/db');
      await submitLaunchSubscriber({ name: name.trim(), contact: contact.trim(), source: 'opening_soon' });
      toast.success(copy.success);
      setName('');
      setContact('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8F0E4] text-[#231916]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{copy.title} — NEXORA</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(214,181,143,.42),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(208,154,130,.22),transparent_31%),linear-gradient(180deg,#FFFDF8_0%,#F8F0E4_54%,#EEDFCC_100%)]" />
      {launch.backgroundImage && <img src={launch.backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.14] mix-blend-multiply" />}
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#D6B58F]/28 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#D09A82]/18 blur-3xl" />
      <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-[#D6B58F]/70 to-transparent" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <img src="/assets/nexora-logo-dark.png" alt="NEXORA" className="h-9 w-auto object-contain sm:h-11" />
          {launch.showSocialLinks !== false && (
            <div className="flex items-center gap-2">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D6B58F] bg-[#FFFDF8]/80 text-[#8C634B] shadow-[0_14px_34px_rgba(43,33,29,.09)] transition hover:-translate-y-0.5 hover:bg-[#D6B58F] hover:text-[#231916] sm:h-11 sm:w-11" aria-label="WhatsApp"><MessageCircle className="h-5 w-5" /></a>
              <a href="https://www.instagram.com/nexora.eg_wear" target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4D6C5] bg-[#FFFDF8]/72 text-[#7A6658] transition hover:-translate-y-0.5 hover:border-[#D6B58F] hover:text-[#8C634B] sm:h-11 sm:w-11" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
            </div>
          )}
        </header>

        <div className="grid flex-1 items-center gap-8 py-9 lg:grid-cols-[1.04fr_.96fr] lg:gap-14 lg:py-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }} className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D6B58F]/70 bg-[#FFFDF8]/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8C634B] shadow-sm backdrop-blur-xl">
              <Sparkles className="h-4 w-4" /> {copy.eyebrow}
            </div>
            <h1 className="mx-auto max-w-4xl text-[clamp(2.55rem,14vw,5rem)] font-black uppercase leading-[0.91] tracking-[-0.075em] text-[#231916] lg:mx-0 lg:text-8xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#5F4D43] sm:text-xl lg:mx-0">{copy.subtitle}</p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#7A6658] lg:mx-0">{copy.announcement}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#231916] px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#FFFDF8] shadow-[0_24px_70px_rgba(43,33,29,.18)] transition hover:-translate-y-0.5 hover:bg-[#D6B58F] hover:text-[#231916] sm:px-7 sm:py-4">
                <MessageCircle className="h-5 w-5" /> {copy.whatsapp}
              </a>
              <a href="mailto:supportnexorastoree@gmail.com" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D7C5B2] bg-[#FFFDF8]/78 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#5F4D43] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#D6B58F] hover:text-[#8C634B] sm:px-7 sm:py-4">
                <Mail className="h-5 w-5" /> support
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .1 }} className="rounded-[34px] border border-[#D7C5B2] bg-[#FFFDF8]/76 p-4 shadow-[0_30px_100px_rgba(43,33,29,.13)] backdrop-blur-2xl sm:rounded-[42px] sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8C634B]"><Clock className="h-4 w-4" /> Launch countdown</div>
                <p className="mt-2 text-sm text-[#7A6658]">{launch.timezone || 'Africa/Cairo'}</p>
              </div>
              <div className="rounded-full border border-[#D6B58F]/70 bg-[#F8F0E4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#8C634B]">Opening soon</div>
            </div>
            {launch.showCountdown !== false && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <TimeBox value={remaining.days} label={copy.days} />
                <TimeBox value={remaining.hours} label={copy.hours} />
                <TimeBox value={remaining.minutes} label={copy.minutes} />
                <TimeBox value={remaining.seconds} label={copy.seconds} />
              </div>
            )}
            {launch.showNotifyForm !== false && (
              <form onSubmit={submit} className="mt-5 rounded-[28px] border border-[#E4D6C5] bg-[#FAF5EE]/78 p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#231916] text-[#FFFDF8]"><Bell className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-lg font-black text-[#231916]">{copy.notifyTitle}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#6F5D50]">{copy.notifyText}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.name} className="min-h-12 rounded-2xl border border-[#D7C5B2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#231916] outline-none placeholder:text-[#A48F7E] focus:border-[#D6B58F]" />
                  <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={copy.contact} className="min-h-12 rounded-2xl border border-[#D7C5B2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#231916] outline-none placeholder:text-[#A48F7E] focus:border-[#D6B58F]" />
                </div>
                <button type="submit" disabled={submitting} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D6B58F] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#231916] transition hover:-translate-y-0.5 hover:bg-[#231916] hover:text-[#FFFDF8] disabled:opacity-60">
                  {submitting ? 'Saving...' : copy.submit} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </motion.div>
        </div>

        <footer className="pb-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#A48F7E]">
          © {new Date().getFullYear()} NEXORA · Premium opening experience
        </footer>
      </section>
    </main>
  );
}
