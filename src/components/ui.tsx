import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, Sparkles, Ticket, Users } from 'lucide-react';
import type { EventRow } from '@/types/database';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils/format';

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    payment_pending: 'Payment pending', payment_submitted: 'Under review', payment_rejected: 'Payment rejected',
    confirmed: 'Confirmed', cancelled: 'Cancelled', expired: 'Expired', pending: 'Pending', submitted: 'Submitted',
    approved: 'Approved', rejected: 'Rejected', valid: 'Valid', used: 'Used', waiting: 'Waiting',
  };
  const tones: Record<string, string> = {
    payment_pending: 'bg-amber-50 text-amber-700 ring-amber-200', payment_submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
    payment_rejected: 'bg-red-50 text-red-700 ring-red-200', confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-200', expired: 'bg-slate-100 text-slate-600 ring-slate-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200', submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200', rejected: 'bg-red-50 text-red-700 ring-red-200',
    valid: 'bg-emerald-50 text-emerald-700 ring-emerald-200', used: 'bg-slate-100 text-slate-600 ring-slate-200', waiting: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold capitalize ring-1 ${tones[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{labels[status] || status.replace(/_/g, ' ')}</span>;
}

export function EventCard({ event, featured = false }: { event: EventRow; featured?: boolean }) {
  const remaining = Math.max(event.capacity - event.tickets_sold, 0);
  return (
    <motion.article whileHover={{ y: -6 }} transition={{ duration: 0.25 }} className={`group overflow-hidden rounded-[24px] bg-white shadow-[0_16px_50px_rgba(7,26,43,0.08)] ring-1 ring-navy-950/5 ${featured ? 'lg:grid lg:grid-cols-[1.15fr_0.85fr]' : ''}`}>
      <Link to={`/events/${event.slug}`} className={`relative block overflow-hidden ${featured ? 'min-h-[360px]' : 'aspect-[1.25]'}`}>
        <img src={event.banner_url || 'https://images.pexels.com/photos/14646741/pexels-photo-14646741.jpeg?auto=compress&cs=tinysrgb&w=1200'} alt={event.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />
        <div className="absolute left-5 top-5 rounded-2xl bg-ivory px-3 py-2 text-center text-navy-950 shadow-lg"><span className="block text-[10px] font-bold uppercase tracking-widest text-gold-500">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}</span><span className="font-display text-2xl font-bold leading-none">{new Date(event.event_date).getDate()}</span></div>
        {event.is_featured && <div className="absolute right-5 top-5 rounded-full bg-gold-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-950">Featured</div>}
        <div className="absolute bottom-5 left-5 right-5 text-white"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-200">PPSU Events 2026</p><h3 className="font-display text-2xl leading-tight md:text-3xl">{event.title}</h3></div>
      </Link>
      <div className={`p-6 ${featured ? 'flex flex-col justify-center lg:p-10' : ''}`}>
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted">{event.short_description || event.description}</p>
        <div className="space-y-2 text-sm text-navy-900/70"><div className="flex items-center gap-2"><CalendarDays size={15} className="text-gold-500" />{formatDate(event.event_date)}</div><div className="flex items-center gap-2"><MapPin size={15} className="text-gold-500" />{event.venue}</div></div>
        <div className="mt-6 flex items-end justify-between border-t border-navy-950/8 pt-5"><div><span className="block text-xs text-muted">Tickets from</span><strong className="font-display text-2xl text-navy-950">{formatCurrency(event.ticket_price)}</strong></div><div className="text-right"><span className="block text-xs text-muted">Availability</span><strong className={`text-sm ${remaining < 25 ? 'text-amber-600' : 'text-emerald-600'}`}>{event.status === 'sold_out' ? 'Sold out' : `${remaining} seats left`}</strong></div></div>
        <Link to={`/events/${event.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-navy-900 transition hover:text-gold-600">View event <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
      </div>
    </motion.article>
  );
}

export function SectionHeading({ eyebrow, title, text, light = false }: { eyebrow: string; title: string; text?: string; light?: boolean }) {
  return <div className={light ? 'text-white' : 'text-navy-950'}><p className={`section-label ${light ? 'text-gold-200' : ''}`}>{eyebrow}</p><h2 className="mt-4 max-w-3xl text-4xl leading-[1.08] md:text-6xl">{title}</h2>{text && <p className={`mt-5 max-w-xl text-base leading-7 ${light ? 'text-white/65' : 'text-muted'}`}>{text}</p>}</div>;
}

export function LoadingState({ label = 'Loading your experience' }: { label?: string }) { return <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-muted"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" /><p className="text-sm">{label}</p></div>; }
export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) { return <div className="rounded-[24px] border border-dashed border-navy-950/15 bg-white px-6 py-16 text-center"><Sparkles className="mx-auto text-gold-400" size={28} /><h3 className="mt-4 font-display text-2xl text-navy-950">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{text}</p>{action && <div className="mt-6">{action}</div>}</div>; }

export function EventMeta({ event }: { event: EventRow }) { return <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-ivory p-5"><CalendarDays size={18} className="text-gold-500" /><p className="mt-3 text-xs uppercase tracking-widest text-muted">Date</p><p className="mt-1 font-semibold text-navy-950">{formatDate(event.event_date)}</p></div><div className="rounded-2xl bg-ivory p-5"><Clock3 size={18} className="text-gold-500" /><p className="mt-3 text-xs uppercase tracking-widest text-muted">Time</p><p className="mt-1 font-semibold text-navy-950">{formatTime(event.start_time)} – {formatTime(event.end_time)}</p></div><div className="rounded-2xl bg-ivory p-5"><MapPin size={18} className="text-gold-500" /><p className="mt-3 text-xs uppercase tracking-widest text-muted">Venue</p><p className="mt-1 font-semibold text-navy-950">{event.venue}</p></div></div>; }

export function Footer() { return <footer className="bg-navy-950 px-6 py-16 text-white md:px-10"><div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.3fr_0.7fr_0.7fr_1fr]"><div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border border-gold-400/60 font-display text-lg text-gold-300">P</span><div><p className="text-sm font-bold tracking-[0.22em]">PPSU EVENTS</p><p className="text-[10px] uppercase tracking-widest text-white/40">Experience more</p></div></div><p className="mt-6 max-w-xs text-sm leading-7 text-white/55">Premium events, unforgettable experiences. A celebration of student life at P. P. Savani University.</p></div><div><p className="text-xs font-bold uppercase tracking-widest text-gold-200">Explore</p><div className="mt-5 space-y-3 text-sm text-white/60"><Link className="block hover:text-white" to="/events">All events</Link><Link className="block hover:text-white" to="/about">Our story</Link><Link className="block hover:text-white" to="/contact">Contact</Link></div></div><div><p className="text-xs font-bold uppercase tracking-widest text-gold-200">Students</p><div className="mt-5 space-y-3 text-sm text-white/60"><Link className="block hover:text-white" to="/sign-in">Sign in</Link><Link className="block hover:text-white" to="/sign-up">Create account</Link><Link className="block hover:text-white" to="/dashboard">My bookings</Link></div></div><div><p className="text-xs font-bold uppercase tracking-widest text-gold-200">PPSU Events</p><p className="mt-5 text-sm leading-7 text-white/60">Grand Auditorium<br />P. P. Savani University<br />Surat, Gujarat</p></div></div><div className="mx-auto mt-14 max-w-7xl border-t border-white/10 pt-6 text-xs text-white/35">© 2026 PPSU Events. Built for unforgettable campus moments.</div></footer>; }

export function TrustStrip() { return <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs font-semibold uppercase tracking-widest text-navy-900/55"><span className="flex items-center gap-2"><Check size={15} className="text-gold-500" /> Verified students</span><span className="flex items-center gap-2"><Ticket size={15} className="text-gold-500" /> Digital tickets</span><span className="flex items-center gap-2"><Users size={15} className="text-gold-500" /> Shared experiences</span></div>; }
