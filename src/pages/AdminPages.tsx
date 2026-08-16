import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarDays, Check, ChevronRight, ClipboardCheck, FileText, LayoutDashboard, LogOut, Menu, Search, Settings, Ticket, Users, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getPaymentProofUrl } from '@/lib/supabase/storage';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils/format';
import { EventCard, EmptyState, LoadingState, StatusBadge } from '@/components/ui';
import type { AuditLogRow, BookingWithDetails, EventRow, WaitlistRow } from '@/types/database';

const adminLinks = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
  { label: 'Events', to: '/admin/events', icon: CalendarDays },
  { label: 'Bookings', to: '/admin/bookings', icon: FileText },
  { label: 'Payments', to: '/admin/payments', icon: BarChart3 },
  { label: 'Attendees', to: '/admin/attendees', icon: Users },
  { label: 'Check-ins', to: '/admin/check-ins', icon: ClipboardCheck },
  { label: 'Waitlists', to: '/admin/waitlists', icon: Ticket },
  { label: 'Audit logs', to: '/admin/audit', icon: FileText },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f3f1ed] text-navy-950">
      <aside
  className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-950 p-6 text-white transition-transform duration-300 ${
    open ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0`}
>
  <div className="flex shrink-0 items-center justify-between">
    <Link to="/" className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-gold-300/70 font-display text-lg text-gold-200">
        P
      </span>

      <div>
        <p className="text-sm font-bold tracking-[.2em]">PPSU EVENTS</p>
        <p className="text-[9px] uppercase tracking-widest text-white/40">
          Operations
        </p>
      </div>
    </Link>

    <button
      type="button"
      onClick={() => setOpen(false)}
      className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
      aria-label="Close navigation"
    >
      <X size={20} />
    </button>
  </div>

  <nav className="mt-12 min-h-0 flex-1 overflow-y-auto pr-1">
    <div className="space-y-1">
      {adminLinks.map(({ label, to, icon: Icon }) => (
        <NavLink
          onClick={() => setOpen(false)}
          key={to}
          to={to}
          end={to === '/admin'}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  </nav>

  <div className="mt-5 shrink-0 border-t border-white/10 pt-5">
    <div className="mb-4 px-4">
      <p className="truncate text-sm font-semibold text-white">
        {profile?.full_name || 'Administrator'}
      </p>

      <p className="mt-1 truncate text-xs text-white/40">
        {profile?.email}
      </p>
    </div>

    <button
      type="button"
      onClick={() => {
        void signOut();
        nav('/');
      }}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
    >
      <LogOut size={16} />
      <span>Sign out</span>
    </button>
  </div>
</aside>

{open && (
  <button
    type="button"
    aria-label="Close navigation"
    onClick={() => setOpen(false)}
    className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm lg:hidden"
  />
)}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-navy-950/8 bg-[#f3f1ed]/90 px-6 backdrop-blur-xl md:px-10">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu size={22} /></button>
          <p className="text-sm font-medium text-muted">PPSU Events Operations</p>
          <Link to="/" className="text-sm font-semibold text-navy-950 hover:text-gold-600">View public site</Link>
        </header>
        <main className="px-6 py-8 md:px-10 md:py-12">{children}</main>
      </div>
    </div>
  );
}

function AdminTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mb-10">
      <p className="section-label">{eyebrow}</p>
      <h1 className="mt-3 text-5xl text-navy-950">{title}</h1>
      {text && <p className="mt-3 text-muted">{text}</p>}
    </div>
  );
}

function AdminStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 ${accent ? 'bg-navy-950 text-white' : 'bg-white ring-1 ring-navy-950/5'}`}>
      <p className={`text-xs uppercase tracking-widest ${accent ? 'text-gold-200' : 'text-muted'}`}>{label}</p>
      <p className={`mt-4 font-display text-4xl ${accent ? 'text-white' : 'text-navy-950'}`}>{value}</p>
    </div>
  );
}

async function adminBookings(): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, events(*), attendees(*), payments(*), tickets(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BookingWithDetails[];
}

export function AdminDashboardPage() {
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['admin-bookings'], queryFn: adminBookings });
  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').order('event_date');
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const pending = bookings.filter((b) => ['payment_pending', 'payment_submitted', 'payment_rejected'].includes(b.status));
  const revenue = confirmed.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const seats = events.reduce((sum, e) => sum + Math.max(e.capacity - e.tickets_sold, 0), 0);
  return (
    <AdminLayout>
      <AdminTitle eyebrow="Overview" title="Good evening, Administrator." text="Here's what's happening across PPSU Events." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStat label="Total tickets" value={confirmed.reduce((sum, b) => sum + (b.tickets?.length || 0), 0)} />
      <AdminStat label="Total bookings" value={confirmed.length} accent />
        <AdminStat label="Revenue" value={formatCurrency(revenue)} />
        <AdminStat label="Pending payments" value={pending.length} />
        <AdminStat label="Seats available" value={seats} />
      </div>
      <div className="mt-12 grid gap-8 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-950/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label">Live queue</p>
              <h2 className="mt-2 font-display text-3xl">Recent bookings</h2>
            </div>
            <Link className="text-sm font-bold text-gold-600" to="/admin/bookings">View all</Link>
          </div>
          {isLoading ? <LoadingState /> : (
            <div className="mt-6 divide-y divide-navy-950/8">
              {bookings.slice(0, 5).map((b) => (
                <Link to="/admin/bookings" key={b.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-gold-600">{b.booking_number}</p>
                    <p className="mt-1 text-sm font-semibold">{b.events?.title}</p>
                    <p className="mt-1 text-xs text-muted">{timeAgo(b.created_at)} · {b.attendee_count} attendee{b.attendee_count !== 1 ? 's' : ''}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
              {!bookings.length && <p className="py-8 text-sm text-muted">No bookings yet.</p>}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-navy-950 p-6 text-white">
          <p className="section-label text-gold-200">Event pulse</p>
          <h2 className="mt-2 font-display text-3xl">Your calendar</h2>
          <div className="mt-6 space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border-b border-white/10 pb-4 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{event.title}</p>
                  <span className="text-xs text-gold-200">{event.tickets_sold}/{event.capacity}</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${Math.min(event.tickets_sold / event.capacity * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export function AdminBookingsPage() {
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['admin-bookings'], queryFn: adminBookings });
  return (
    <AdminLayout>
      <AdminTitle eyebrow="Operations" title="Bookings" text="Every reservation, from first click to confirmation." />
      <div className="rounded-2xl bg-white ring-1 ring-navy-950/5">
        <div className="flex flex-col gap-3 border-b border-navy-950/8 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 rounded-xl bg-ivory px-4 py-2.5 text-sm text-muted"><Search size={16} /> Search bookings</div>
          <span className="text-sm text-muted">{bookings.length} total</span>
        </div>
        {isLoading ? <LoadingState /> : bookings.length === 0 ? (
          <div className="p-6"><EmptyState title="No bookings yet" text="When students book, their reservations will appear here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-5 py-4">Booking</th>
                  <th className="px-5 py-4">Event</th>
                  <th className="px-5 py-4">Attendees</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-950/8">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-ivory/50">
                    <td className="px-5 py-4 font-bold text-gold-600">{b.booking_number}</td>
                    <td className="px-5 py-4 font-semibold">{b.events?.title}</td>
                    <td className="px-5 py-4 text-muted">{b.attendee_count}</td>
                    <td className="px-5 py-4">{formatCurrency(b.total_amount)}</td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4 text-muted">{timeAgo(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export function AdminPaymentsPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['admin-bookings'], queryFn: adminBookings });
  const pending = bookings.filter((b) => b.payments?.some((p) => p.status === 'submitted' || p.status === 'pending'));
  const [selected, setSelected] = useState<BookingWithDetails | null>(null);
const [note, setNote] = useState('');
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');
const [proofUrl, setProofUrl] = useState<string | null>(null);
const [proofLoading, setProofLoading] = useState(false);

useEffect(() => {
  let cancelled = false;

  const loadProof = async () => {
    setProofUrl(null);

    if (!selected) return;

    const proofPath = selected.payments?.[0]?.proof_url;

    if (!proofPath) return;

    setProofLoading(true);

    const url = await getPaymentProofUrl(proofPath);

    if (!cancelled) {
      setProofUrl(url);
      setProofLoading(false);
    }
  };

  void loadProof();

  return () => {
    cancelled = true;
  };
}, [selected]);


    
  const review = async (approve: boolean) => {
    if (!selected || !user || !selected.payments?.[0]) return;
    if (!approve && !note.trim()) { setError('Please provide a rejection reason.'); return; }
    setBusy(true);
    setError('');
    const payment = selected.payments[0];
    const result = approve
      ? await supabase.rpc('approve_payment', { p_payment_id: payment.id, p_admin_id: user.id, p_admin_note: note || null })
      : await supabase.rpc('reject_payment', { p_payment_id: payment.id, p_admin_id: user.id, p_rejection_reason: note });
    setBusy(false);
    if (result.error) { setError('Unable to process. Please try again.'); return; }
    setSelected(null);
    setNote('');
    await client.invalidateQueries({ queryKey: ['admin-bookings'] });
  };

  return (
    <AdminLayout>
      <AdminTitle eyebrow="Finance" title="Payment review" text="Review manual UPI submissions and issue tickets with confidence." />
      <div className="rounded-2xl bg-white ring-1 ring-navy-950/5">
        <div className="border-b border-navy-950/8 p-5 text-sm text-muted">{pending.length} payment{pending.length !== 1 ? 's' : ''} awaiting attention</div>
        {isLoading ? <LoadingState /> : pending.length ? (
          <div className="divide-y divide-navy-950/8">
            {pending.map((b) => {
              const p = b.payments?.[0];
              return (
                <button onClick={() => setSelected(b)} key={b.id} className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-ivory/60 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-gold-600">{b.booking_number}</p>
                    <p className="mt-1 font-semibold">{b.events?.title}</p>
                    <p className="mt-1 text-xs text-muted">{b.attendees?.[0]?.full_name} · {p?.transaction_reference || 'No reference yet'}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <strong>{formatCurrency(b.total_amount)}</strong>
                    <StatusBadge status={p?.status || 'pending'} />
                    <ChevronRight size={17} className="text-muted" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : <p className="p-10 text-center text-sm text-muted">No pending payments. You're all caught up.</p>}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-4 md:items-center">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="section-label">Payment review</p>
                <h2 className="mt-2 font-display text-3xl">{selected.booking_number}</h2>
              </div>
              <button onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="mt-7 rounded-2xl bg-ivory p-5 text-sm">
              <p className="font-semibold">{selected.events?.title}</p>
              <p className="mt-2 text-muted">{selected.attendees?.map((a) => a.full_name).join(', ')}</p>
              <p className="mt-3 font-display text-3xl">{formatCurrency(selected.total_amount)}</p>
              <p className="mt-2 text-muted">Reference: {selected.payments?.[0]?.transaction_reference || 'Not provided'}</p>
            </div>
           {selected.payments?.[0]?.proof_url && (
  <div className="mt-5">
    <p className="mb-3 text-sm font-semibold text-navy-950">
      Payment proof
    </p>

    <div className="overflow-hidden rounded-2xl border border-navy-950/10 bg-ivory">
      {proofLoading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted">
          Loading payment proof…
        </div>
      ) : proofUrl ? (
        <a
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={proofUrl}
            alt={`Payment proof for ${selected.booking_number}`}
            className="max-h-[420px] w-full object-contain"
          />
          <div className="border-t border-navy-950/10 bg-white px-4 py-3 text-center text-xs font-semibold text-gold-700">
            Click to open full-size proof
          </div>
        </a>
      ) : (
        <div className="flex min-h-48 items-center justify-center p-6 text-center text-sm text-red-600">
          Unable to load the payment proof.
        </div>
      )}
    </div>
  </div>
)}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-field mt-5 min-h-24" placeholder="Admin note or rejection reason (required for rejection)" />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button disabled={busy} onClick={() => void review(false)} className="flex-1 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">Reject</button>
              <button disabled={busy} onClick={() => void review(true)} className="btn-primary flex-1 disabled:opacity-50">{busy ? 'Processing…' : 'Approve payment'} <Check size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminEventsPage() {
  const client = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').order('event_date');
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [creating, setCreating] = useState(false);
  const updateStatus = async (event: EventRow) => {
    const next = event.status === 'active' ? 'draft' : 'active';
    await supabase.from('events').update({ status: next }).eq('id', event.id);
    await client.invalidateQueries({ queryKey: ['admin-events'] });
  };
  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <AdminTitle
    eyebrow="Programming"
    title="Events"
    text="Shape the calendar and keep every experience moving."
  />

  <button
    onClick={() => setCreating(true)}
    className="btn-primary mb-10 whitespace-nowrap"
  >
    + Add event
  </button>
</div>
      <div className="grid gap-6 md:grid-cols-2">
        {isLoading ? <LoadingState /> : events.map((event) => (
          <div key={event.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy-950/5">
            <EventCard event={event} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => void updateStatus(event)} className="btn-ghost flex-1 border border-navy-950/10 text-xs">{event.status === 'active' ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => setEditing(event)} className="btn-primary flex-1 px-4 py-2.5 text-xs">Edit event</button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <EventEditModal
          event={editing}
          close={() => setEditing(null)}
          done={() => { setEditing(null); void client.invalidateQueries({ queryKey: ['admin-events'] }); }}
        />
      )}

{creating && (
  <EventCreateModal
    close={() => setCreating(false)}
    done={() => {
      setCreating(false);
      void client.invalidateQueries({ queryKey: ['admin-events'] });
    }}
  />
)}

    </AdminLayout>
  );
}

function EventCreateModal({ close, done }: { close: () => void; done: () => void }) {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  
  const [bannerUrl, setBannerUrl] = useState('');
  const [reservationExpiryHours, setReservationExpiryHours] = useState('24');
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be signed in as an administrator.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter an event title.');
      return;
    }

    if (!eventDate) {
      setError('Please select an event date.');
      return;
    }

    if (!startTime || !endTime) {
      setError('Please enter both start and end times.');
      return;
    }

    if (!venue.trim()) {
      setError('Please enter the event venue.');
      return;
    }

    if (!capacity || Number(capacity) <= 0) {
      setError('Please enter a valid capacity.');
      return;
    }

    if (!price || Number(price) < 0) {
      setError('Please enter a valid ticket price.');
      return;
    }

    setSaving(true);
    setError('');

    const generatedSlug =
      slug.trim() ||
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const { error } = await supabase.from('events').insert({
      title: title.trim(),
      slug: generatedSlug,
      description: description.trim(),
      short_description: shortDescription.trim(),
      venue: venue.trim(),
      address: address.trim() || null,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      capacity: Number(capacity),
      tickets_sold: 0,
      ticket_price: Number(price),
      upi_id: upiId.trim() || null,
      upi_qr_url: upiQrUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      reservation_expiry_hours: Number(reservationExpiryHours) || 24,
      status,
      is_featured: isFeatured,
      created_by: user.id,
    });

    if (error) {
      console.error('EVENT CREATE ERROR:', error);
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    done();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <form
        onSubmit={save}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Programming</p>
            <h2 className="mt-2 font-display text-3xl text-navy-950">
              Add event
            </h2>
            <p className="mt-2 text-sm text-muted">
              Create a new event for the PPSU Events calendar.
            </p>
          </div>

          <button type="button" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <div className="mt-7 space-y-4">
          <label className="block text-sm font-semibold">
            Title
            <input
              className="input-field mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
            />
          </label>

          <label className="block text-sm font-semibold">
            Slug
            <input
              className="input-field mt-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Leave blank to generate automatically"
            />
          </label>

          <label className="block text-sm font-semibold">
            Short description
            <textarea
              className="input-field mt-2 min-h-20"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short description shown on event cards"
            />
          </label>

          <label className="block text-sm font-semibold">
            Description
            <textarea
              className="input-field mt-2 min-h-28"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full event description"
            />
          </label>

          <label className="block text-sm font-semibold">
            Event date
            <input
              className="input-field mt-2"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Start time
              <input
                className="input-field mt-2"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold">
              End time
              <input
                className="input-field mt-2"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Venue
            <input
              className="input-field mt-2"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Lord Plaza, Ankleshwar"
            />
          </label>

          <label className="block text-sm font-semibold">
            Address
            <textarea
              className="input-field mt-2 min-h-20"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full event address"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Ticket price
              <input
                className="input-field mt-2"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1199"
              />
            </label>

            <label className="block text-sm font-semibold">
              Capacity
              <input
                className="input-field mt-2"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="100"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            UPI ID
            <input
              className="input-field mt-2"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="example@upi"
            />
          </label>

          <label className="block text-sm font-semibold">
            UPI QR URL
            <input
              className="input-field mt-2"
              value={upiQrUrl}
              onChange={(e) => setUpiQrUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="block text-sm font-semibold">
            Banner URL
            <input
              className="input-field mt-2"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="block text-sm font-semibold">
            Reservation expiry (hours)
            <input
              className="input-field mt-2"
              type="number"
              min="1"
              value={reservationExpiryHours}
              onChange={(e) => setReservationExpiryHours(e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold">
            Status
            <select
              className="input-field mt-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="sold_out">Sold out</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-ivory p-4 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4"
            />
            Feature this event
          </label>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={close}
            className="btn-ghost flex-1 border border-navy-950/10"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventEditModal({ event, close, done }: { event: EventRow; close: () => void; done: () => void }) {
   const [title, setTitle] = useState(event.title);
  const [slug, setSlug] = useState(event.slug);
  const [description, setDescription] = useState(event.description);
  const [shortDescription, setShortDescription] = useState(event.short_description);
  const [venue, setVenue] = useState(event.venue);
  const [address, setAddress] = useState(event.address || '');
  const [eventDate, setEventDate] = useState(event.event_date);
  const [startTime, setStartTime] = useState(event.start_time);
  const [endTime, setEndTime] = useState(event.end_time);
  const [capacity, setCapacity] = useState(String(event.capacity));
  const [price, setPrice] = useState(String(event.ticket_price));
  const [upiId, setUpiId] = useState(event.upi_id || '');
  const [upiQrUrl, setUpiQrUrl] = useState(event.upi_qr_url || '');
  const [bannerUrl, setBannerUrl] = useState(event.banner_url || '');
  const [reservationExpiryHours, setReservationExpiryHours] = useState(
    String(event.reservation_expiry_hours)
  );
  const [isFeatured, setIsFeatured] = useState(event.is_featured);
  const [status, setStatus] = useState(event.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
   const save = async (e: React.FormEvent) => {
  e.preventDefault();

  setSaving(true);
  setError('');

  const { error } = await supabase
    .from('events')
    .update({
      title,
      slug,
      description,
      short_description: shortDescription,
      venue,
      address,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      capacity: Number(capacity),
      ticket_price: Number(price),
      upi_id: upiId || null,
      upi_qr_url: upiQrUrl || null,
      banner_url: bannerUrl || null,
      reservation_expiry_hours: Number(reservationExpiryHours),
      is_featured: isFeatured,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id);

  if (error) {
    console.error('EVENT UPDATE ERROR:', error);
    setError(error.message);
    setSaving(false);
    return;
  }

  setSaving(false);
  done();
};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <form
  onSubmit={save}
  className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
>
        <div className="flex justify-between">
          <h2 className="font-display text-3xl">Edit event</h2>
          <button type="button" onClick={close}><X size={20} /></button>
        </div>
       <div className="mt-7 space-y-4">
  <label className="block text-sm font-semibold">
    Title
    <input
      className="input-field mt-2"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />
  </label>

  <label className="block text-sm font-semibold">
    Event date
    <input
      className="input-field mt-2"
      type="date"
      value={eventDate}
      onChange={(e) => setEventDate(e.target.value)}
    />
  </label>

  <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-semibold">
      Start time
      <input
        className="input-field mt-2"
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />
    </label>

    <label className="block text-sm font-semibold">
      End time
      <input
        className="input-field mt-2"
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />
    </label>
  </div>

  <label className="block text-sm font-semibold">
    Venue
    <input
      className="input-field mt-2"
      value={venue}
      onChange={(e) => setVenue(e.target.value)}
      placeholder="e.g. PPSU Auditorium"
    />
  </label>

  <label className="block text-sm font-semibold">
    Address
    <textarea
      className="input-field mt-2 min-h-20"
      value={address}
      onChange={(e) => setAddress(e.target.value)}
      placeholder="Enter the event address"
    />
  </label>

  <label className="block text-sm font-semibold">
    Ticket price
    <input
      className="input-field mt-2"
      type="number"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
    />
  </label>

  <label className="block text-sm font-semibold">
    Capacity
    <input
      className="input-field mt-2"
      type="number"
      value={capacity}
      onChange={(e) => setCapacity(e.target.value)}
    />
  </label>
</div>
        <button className="btn-primary mt-7 w-full">Save changes</button>
      </form>
    </div>
  );
}

export function AdminAttendeesPage() {
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['admin-bookings'], queryFn: adminBookings });
  const attendees = bookings.flatMap((b) => (b.attendees || []).map((a) => ({ attendee: a, booking: b })));
  return (
    <AdminLayout>
      <AdminTitle eyebrow="Operations" title="Attendees" text="Review and manage the people joining each experience." />
      <div className="rounded-2xl bg-white ring-1 ring-navy-950/5">
        {isLoading ? <LoadingState /> : attendees.length === 0 ? (
          <div className="p-6"><EmptyState title="No attendees yet" text="When students book, their attendee details will appear here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Student ID</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Event</th>
                  <th className="px-5 py-4">Booking</th>
                  <th className="px-5 py-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-950/8">
                {attendees.map(({ attendee, booking }) => (
                  <tr key={attendee.id} className="hover:bg-ivory/50">
                    <td className="px-5 py-4 font-semibold">{attendee.full_name}</td>
                    <td className="px-5 py-4 text-muted">{attendee.student_id}</td>
                    <td className="px-5 py-4 text-muted">{attendee.email}</td>
                    <td className="px-5 py-4 text-muted">{booking.events?.title}</td>
                    <td className="px-5 py-4 font-bold text-gold-600">{booking.booking_number}</td>
                    <td className="px-5 py-4">
  <span
    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
      booking.ticket_type === 'couple'
        ? 'bg-navy-50 text-navy-700'
        : 'bg-gold-50 text-gold-700'
    }`}
  >
    {booking.ticket_type === 'couple'
      ? 'Couple'
      : 'Regular'}
  </span>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export function AdminCheckInsPage() {
  const { user, isStaff, isGateStaff } = useAuth();
  const client = useQueryClient();

  const [qrToken, setQrToken] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    ticket_number: string;
    attendee_name: string;
    event_title: string;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!scanning) return;

    let scanner: import('html5-qrcode').Html5Qrcode | null = null;
    let cancelled = false;

    const startScanner = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (cancelled) return;

      scanner = new Html5Qrcode('qr-reader');

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
  if (cancelled) return;

  setQrToken(decodedText);
  setScanning(false);
},
          () => {
            // Ignore normal scanning failures while looking for a QR code.
          }
        );
     } catch (error) {
  console.error('QR scanner error:', error);
  setScanning(false);
  setResult({
    success: false,
    ticket_number: '',
    attendee_name: '',
    event_title: '',
    message: 'Unable to access the camera. Please allow camera permission and try again.',
  });
}
    };

    void startScanner();

    return () => {
      cancelled = true;

      if (scanner) {
        void scanner.stop().catch(() => {
          // Ignore cleanup errors.
        });
      }
    };
  }, [scanning]);

  const checkIn = async () => {
    if (!qrToken.trim() || !user) return;

    console.log('CHECK-IN REQUEST', {
      input: qrToken.trim(),
      staffId: user.id,
      isStaff,
      isGateStaff,
    });

    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.rpc('check_in_ticket', { p_input: qrToken.trim(), p_staff_id: user.id });
    setBusy(false);

    if (error) {
      console.error('CHECK-IN RPC ERROR', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      setResult({
        success: false,
        ticket_number: '',
        attendee_name: '',
        event_title: '',
        message: error.message || 'Unable to check in ticket.',
      });
      return;
    }

    if (!data || data.length === 0) {
      console.error('CHECK-IN RPC EMPTY RESULT', { data, error });
      setResult({
        success: false,
        ticket_number: '',
        attendee_name: '',
        event_title: '',
        message: 'No ticket result returned from the check-in RPC.',
      });
      return;
    }

    setResult(data[0]);
    setQrToken('');
    await client.invalidateQueries({ queryKey: ['admin-checkins'] });
  };

  const { data: checkIns = [], isLoading: checkInsLoading } = useQuery({
    queryKey: ['admin-checkins'],
    queryFn: async () => {
      const { data, error } = await supabase.from('check_ins').select('*, tickets(ticket_number, attendees(full_name))').order('checked_in_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <AdminLayout>
      <AdminTitle eyebrow="At the door" title="Check-ins" text="Verify digital tickets and welcome students into the event." />
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="rounded-2xl bg-white p-7 ring-1 ring-navy-950/5">
          <h2 className="font-display text-3xl text-navy-950">Verify ticket</h2>
          <p className="mt-2 text-sm text-muted">Enter or scan the ticket QR token to check in an attendee.</p>
          {scanning && (
  <div className="mt-6 overflow-hidden rounded-2xl border border-navy-950/10 bg-black">
    <div id="qr-reader" className="w-full" />
    <button
      type="button"
      onClick={() => setScanning(false)}
      className="w-full bg-navy-950 px-5 py-3 text-sm font-bold text-white"
    >
      Cancel scanner
    </button>
  </div>
)}
        <div className="mt-6 space-y-3">
  {/* Ticket token input */}
  <input
    type="text"
    className="input-field w-full text-base"
    placeholder="Paste QR token or ticket number"
    value={qrToken}
    onChange={(e) => setQrToken(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') void checkIn();
    }}
  />

  {/* Actions */}
  <div className="flex flex-col gap-3 sm:flex-row">
    <button
      type="button"
      onClick={() => setScanning(true)}
      disabled={busy || scanning}
      className="flex-1 rounded-full border border-navy-950/10 bg-white px-6 py-3 text-sm font-bold text-navy-950 transition hover:bg-ivory disabled:opacity-50"
    >
      Scan QR
    </button>

    <button
      type="button"
      disabled={busy || !qrToken.trim()}
      onClick={() => void checkIn()}
      className="btn-primary flex-1 whitespace-nowrap px-6 disabled:opacity-50"
    >
      {busy ? 'Checking…' : 'Check in'}
    </button>
  </div>
</div>
          {result && (
            <div className={`mt-6 rounded-2xl p-6 ${result.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {result.success ? <Check className="text-emerald-600" size={24} /> : <X className="text-red-600" size={24} />}
                <div>
                  <p className={`font-display text-2xl ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>{result.success ? 'Valid ticket' : 'Invalid'}</p>
                  <p className={`text-sm ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>{result.message}</p>
                </div>
              </div>
              {result.success && (
                <div className="mt-4 space-y-1 text-sm text-emerald-800">
                  <p><strong>Ticket:</strong> {result.ticket_number}</p>
                  <p><strong>Attendee:</strong> {result.attendee_name}</p>
                  <p><strong>Event:</strong> {result.event_title}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-950/5">
          <p className="section-label">Recent check-ins</p>
          <h2 className="mt-2 font-display text-2xl text-navy-950">Today's activity</h2>
          {checkInsLoading ? <LoadingState /> : checkIns.length === 0 ? (
            <p className="mt-6 py-8 text-center text-sm text-muted">No check-ins recorded yet.</p>
          ) : (
            <div className="mt-6 divide-y divide-navy-950/8">
              {checkIns.map((ci: { id: string; checked_in_at: string; tickets: { ticket_number: string; attendees: { full_name: string } } }) => (
                <div key={ci.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-semibold">{ci.tickets?.attendees?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted">{ci.tickets?.ticket_number}</p>
                  </div>
                  <span className="text-xs text-muted">{timeAgo(ci.checked_in_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export function AdminWaitlistsPage() {
  const { data: waitlists = [], isLoading } = useQuery({
    queryKey: ['admin-waitlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlists')
        .select('*, events(title), profiles(full_name, email)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as (WaitlistRow & { events: { title: string } | null; profiles: { full_name: string | null; email: string | null } | null })[];
    },
  });
  return (
    <AdminLayout>
      <AdminTitle eyebrow="Demand" title="Waitlists" text="See who is waiting for the next available seat." />
      <div className="rounded-2xl bg-white ring-1 ring-navy-950/5">
        {isLoading ? <LoadingState /> : waitlists.length === 0 ? (
          <div className="p-6"><EmptyState title="No waitlist entries" text="When events sell out, students who join the waitlist will appear here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Event</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-950/8">
                {waitlists.map((w) => (
                  <tr key={w.id} className="hover:bg-ivory/50">
                    <td className="px-5 py-4 font-semibold">{w.profiles?.full_name || 'Unknown'}</td>
                    <td className="px-5 py-4 text-muted">{w.profiles?.email || ''}</td>
                    <td className="px-5 py-4 text-muted">{w.events?.title || ''}</td>
                    <td className="px-5 py-4"><StatusBadge status={w.status} /></td>
                    <td className="px-5 py-4 text-muted">{formatDate(w.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export function AdminAuditPage() {
  const [activeTab, setActiveTab] = useState<
    'booking' | 'checkin' | 'payment'
  >('payment');

  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      return (data || []) as AuditLogRow[];
    },
  });

  const {
  data: payments = [],
  isLoading: paymentsLoading,
} = useQuery({
  queryKey: ['admin-audit-payments'],
  queryFn: async () => {
    // 1. Load payments without nested Supabase relationships.
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        booking_id,
        user_id,
        amount,
        payment_method,
        transaction_reference,
        status,
        admin_note,
        reviewed_by,
        reviewed_at,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (paymentError) {
      throw paymentError;
    }

    const rawPayments = paymentData || [];

    if (rawPayments.length === 0) {
      return [];
    }

    // 2. Collect booking and profile IDs.
    const bookingIds = [
      ...new Set(
        rawPayments
          .map((payment) => payment.booking_id)
          .filter(Boolean)
      ),
    ];

    const userIds = [
      ...new Set(
        rawPayments
          .map((payment) => payment.user_id)
          .filter(Boolean)
      ),
    ];

    const reviewerIds = [
      ...new Set(
        rawPayments
          .map((payment) => payment.reviewed_by)
          .filter(Boolean)
      ),
    ];

    // 3. Load bookings separately.
    const { data: bookingData, error: bookingError } = bookingIds.length
      ? await supabase
          .from('bookings')
          .select(`
            id,
            booking_number,
            event_id
          `)
          .in('id', bookingIds)
      : { data: [], error: null };

    if (bookingError) {
      throw bookingError;
    }

    const bookings = bookingData || [];

    // 4. Load events separately.
    const eventIds = [
      ...new Set(
        bookings
          .map((booking) => booking.event_id)
          .filter(Boolean)
      ),
    ];

    const { data: eventData, error: eventError } = eventIds.length
      ? await supabase
          .from('events')
          .select(`
            id,
            title
          `)
          .in('id', eventIds)
      : { data: [], error: null };

    if (eventError) {
      throw eventError;
    }

    const events = eventData || [];

    // 5. Load profiles separately.
    const profileIds = [
      ...new Set([...userIds, ...reviewerIds]),
    ];

    const { data: profileData, error: profileError } = profileIds.length
      ? await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            student_id
          `)
          .in('id', profileIds)
      : { data: [], error: null };

    if (profileError) {
      throw profileError;
    }

    const profiles = profileData || [];

    // 6. Create lookup maps.
    const bookingMap = new Map(
      bookings.map((booking) => [
        booking.id,
        booking,
      ])
    );

    const eventMap = new Map(
      events.map((event) => [
        event.id,
        event,
      ])
    );

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ])
    );

    // 7. Build the structure used by the payment audit UI.
    return rawPayments.map((payment) => {
      const booking = bookingMap.get(payment.booking_id);

      const event = booking?.event_id
        ? eventMap.get(booking.event_id)
        : undefined;

      const payer = payment.user_id
        ? profileMap.get(payment.user_id)
        : undefined;

      const reviewer = payment.reviewed_by
        ? profileMap.get(payment.reviewed_by)
        : undefined;

      return {
        ...payment,

        bookings: booking
          ? {
              booking_number: booking.booking_number,
              event_id: booking.event_id,
              events: event
                ? {
                    title: event.title,
                  }
                : null,
            }
          : null,

        payer: payer || null,

        reviewer: reviewer || null,
      };
    });
  },
});

  const bookingLogs = logs.filter((log) =>
    [
      'booking_created',
      'booking_cancelled',
      'booking_expired',
      'booking_updated',
    ].includes(log.action)
  );

  const checkInLogs = logs.filter((log) =>
    [
      'ticket_checked_in',
      'check_in',
      'ticket_check_in',
    ].includes(log.action)
  );

  const paymentLogs = logs.filter((log) =>
    [
      'payment_approved',
      'payment_rejected',
      'payment_submitted',
    ].includes(log.action)
  );

  const paymentRows = payments.filter((payment) => {
    return (
      payment.status === 'pending' ||
      payment.status === 'approved' ||
      payment.status === 'rejected' ||
      paymentLogs.some((log) => log.entity_id === payment.id)
    );
  });

  const isLoadingPayments = isLoading || paymentsLoading;

const auditError = error;

return (
    <AdminLayout>
      <AdminTitle
        eyebrow="Governance"
        title="Audit logs"
        text="A clear record of important actions across PPSU Events."
      />

      {/* Tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-navy-950/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === 'booking'
              ? 'bg-navy-950 text-white'
              : 'text-muted hover:bg-navy-950/5'
          }`}
        >
          Bookings
          <span className="ml-2 opacity-60">
            {bookingLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === 'checkin'
              ? 'bg-navy-950 text-white'
              : 'text-muted hover:bg-navy-950/5'
          }`}
        >
          Check-ins
          <span className="ml-2 opacity-60">
            {checkInLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === 'payment'
              ? 'bg-navy-950 text-white'
              : 'text-muted hover:bg-navy-950/5'
          }`}
        >
          Payments
          <span className="ml-2 opacity-60">
            {paymentRows.length}
          </span>
        </button>
      </div>

      {/* Error */}
      {auditError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            Unable to load audit information.
          </p>

          <p className="mt-1 text-xs opacity-80">
            Please check your database permissions and try again.
          </p>
        </div>
      )}

      {/* BOOKING AUDIT */}
      {activeTab === 'booking' && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-navy-950/5">
          {isLoading ? (
            <LoadingState />
          ) : bookingLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No booking audit entries"
                text="Booking actions will appear here when bookings are created, changed, cancelled, or expired."
              />
            </div>
          ) : (
            <div className="divide-y divide-navy-950/8">
              {bookingLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-ivory/60 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-950/5">
                      <span className="text-sm font-bold text-navy-950">
                        B
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-semibold capitalize text-navy-950">
                        {log.action.replace(/_/g, ' ')}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        Booking
                        {log.entity_id
                          ? ` · ${log.entity_id.slice(0, 8)}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs font-medium text-muted">
                      {timeAgo(log.created_at)}
                    </p>

                    <p className="mt-1 text-[11px] text-muted/70">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHECK-IN AUDIT */}
      {activeTab === 'checkin' && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-navy-950/5">
          {isLoading ? (
            <LoadingState />
          ) : checkInLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No check-in audit entries"
                text="Ticket check-in activity will appear here."
              />
            </div>
          ) : (
            <div className="divide-y divide-navy-950/8">
              {checkInLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-ivory/60 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <span className="text-sm font-bold text-emerald-700">
                        ✓
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-semibold capitalize text-navy-950">
                        {log.action.replace(/_/g, ' ')}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        Ticket
                        {log.entity_id
                          ? ` · ${log.entity_id.slice(0, 8)}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs font-medium text-muted">
                      {timeAgo(log.created_at)}
                    </p>

                    <p className="mt-1 text-[11px] text-muted/70">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAYMENT AUDIT */}
      {activeTab === 'payment' && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-navy-950/5">
          {isLoadingPayments ? (
            <LoadingState />
          ) : paymentRows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No payment audit entries"
                text="Payment submissions, approvals, and rejections will appear here."
              />
            </div>
          ) : (
            <div className="divide-y divide-navy-950/8">
              {paymentRows.map((payment: any) => {
                const payer = Array.isArray(payment.payer)
                  ? payment.payer[0]
                  : payment.payer;

                const reviewer = Array.isArray(payment.reviewer)
                  ? payment.reviewer[0]
                  : payment.reviewer;

                const booking = Array.isArray(payment.bookings)
                  ? payment.bookings[0]
                  : payment.bookings;

                const event = Array.isArray(booking?.events)
                  ? booking.events[0]
                  : booking?.events;

                const isApproved = payment.status === 'approved';
                const isRejected = payment.status === 'rejected';
                const isPending = payment.status === 'pending';

                return (
                  <div
                    key={payment.id}
                    className="p-6 transition hover:bg-ivory/30"
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                            isApproved
                              ? 'bg-emerald-100'
                              : isRejected
                              ? 'bg-red-100'
                              : 'bg-amber-100'
                          }`}
                        >
                          <span
                            className={`text-sm font-bold ${
                              isApproved
                                ? 'text-emerald-700'
                                : isRejected
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {isApproved
                              ? '✓'
                              : isRejected
                              ? '!'
                              : '…'}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isRejected
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {payment.status}
                            </span>

                            <span className="text-xs text-muted">
                              Payment
                            </span>
                          </div>

                          <h3 className="mt-3 font-display text-2xl text-navy-950">
                            {event?.title || 'PPSU Event'}
                          </h3>

                          <p className="mt-1 text-xs text-muted">
                            Booking{' '}
                            {booking?.booking_number ||
                              payment.booking_id?.slice(0, 8)}
                          </p>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="font-display text-2xl text-navy-950">
                          {formatCurrency(payment.amount)}
                        </p>

                        <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                          {payment.payment_method?.toUpperCase() ||
                            'PAYMENT'}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="mt-6 grid gap-4 rounded-2xl bg-ivory p-5 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted">
                          Paid by
                        </p>

                        <p className="mt-2 font-semibold text-navy-950">
                          {payer?.full_name || 'Unknown user'}
                        </p>

                        <p className="mt-1 text-sm text-muted">
                          {payer?.email || 'No email'}
                        </p>

                        <p className="mt-1 text-sm text-muted">
                          Student ID:{' '}
                          {payer?.student_id || 'Not available'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted">
                          Transaction
                        </p>

                        <p className="mt-2 break-all font-mono text-sm font-semibold text-navy-950">
                          {payment.transaction_reference ||
                            'No transaction reference'}
                        </p>

                        <p className="mt-1 text-sm text-muted">
                          Payment submitted:{' '}
                          {payment.created_at
                            ? new Date(
                                payment.created_at
                              ).toLocaleString()
                            : 'Unknown'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted">
                          Reviewed by
                        </p>

                        <p className="mt-2 font-semibold text-navy-950">
                          {reviewer?.full_name ||
                            (isApproved || isRejected
                              ? 'Unknown administrator'
                              : 'Not reviewed')}
                        </p>

                        <p className="mt-1 text-sm text-muted">
                          {reviewer?.email || ''}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted">
                          Review date
                        </p>

                        <p className="mt-2 text-sm font-semibold text-navy-950">
                          {payment.reviewed_at
                            ? new Date(
                                payment.reviewed_at
                              ).toLocaleString()
                            : 'Not reviewed'}
                        </p>
                      </div>
                    </div>

                    {/* Admin note */}
                    {payment.admin_note && (
                      <div
                        className={`mt-4 rounded-xl p-4 text-sm ${
                          isRejected
                            ? 'bg-red-50 text-red-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        <p className="font-semibold">
                          {isRejected
                            ? 'Rejection reason'
                            : 'Admin note'}
                        </p>

                        <p className="mt-1">
                          {payment.admin_note}
                        </p>
                      </div>
                    )}

                    {/* Pending indicator */}
                    {isPending && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <p className="font-semibold">
                          Payment awaiting review
                        </p>

                        <p className="mt-1">
                          This payment has been submitted but has
                          not yet been approved or rejected by an
                          administrator.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminSettingsPage() {
  const { user, isStaff } = useAuth();

  const [platformName, setPlatformName] = useState('');
const [upiId, setUpiId] = useState('');
const [upiQrUrl, setUpiQrUrl] = useState('');
const [reservationHours, setReservationHours] = useState('24');

const [qrFile, setQrFile] = useState<File | null>(null);
const [uploadingQr, setUploadingQr] = useState(false);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('PLATFORM SETTINGS LOAD ERROR:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setPlatformName(data.platform_name || '');
        setUpiId(data.upi_id || '');
        setUpiQrUrl(data.upi_qr_url || '');
        setReservationHours(
          String(data.default_reservation_hours ?? 24)
        );
      }

      setLoading(false);
    };

    void loadSettings();
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!user) {
    setError('You must be signed in as an administrator.');
    return;
  }

  setSaving(true);
  setMessage('');
  setError('');

  try {
    let finalQrUrl = upiQrUrl;

    /*
     * Upload a new QR image if the admin selected one.
     */
    if (qrFile) {
      setUploadingQr(true);

      const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/webp',
      ];

      if (!allowedTypes.includes(qrFile.type)) {
        throw new Error(
          'Please upload a PNG, JPG, or WebP image.'
        );
      }

      if (qrFile.size > 5 * 1024 * 1024) {
        throw new Error(
          'QR image must be smaller than 5 MB.'
        );
      }

      const fileExtension =
        qrFile.name.split('.').pop()?.toLowerCase() || 'png';

      const fileName = `upi-qr-${Date.now()}.${fileExtension}`;

      const filePath = `upi/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-assets')
        .upload(filePath, qrFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: qrFile.type,
        });

      if (uploadError) {
        console.error('UPI QR UPLOAD ERROR:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('payment-assets')
        .getPublicUrl(filePath);

      finalQrUrl = publicUrlData.publicUrl;

      setUpiQrUrl(finalQrUrl);
      setQrFile(null);
      setUploadingQr(false);
    }

    /*
     * Save platform settings.
     */
    const { error: updateError } = await supabase
      .from('platform_settings')
      .update({
        platform_name: platformName.trim(),
        upi_id: upiId.trim() || null,
        upi_qr_url: finalQrUrl.trim() || null,
        default_reservation_hours: Number(reservationHours),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .not('id', 'is', null);

    if (updateError) {
      console.error(
        'PLATFORM SETTINGS UPDATE ERROR:',
        updateError
      );

      throw new Error(updateError.message);
    }

    setMessage('Platform settings saved successfully.');
  } catch (error) {
    console.error('SETTINGS SAVE ERROR:', error);

    setError(
      error instanceof Error
        ? error.message
        : 'Unable to save platform settings.'
    );
  } finally {
    setUploadingQr(false);
    setSaving(false);
  }
};

  return (
    <AdminLayout>
      <AdminTitle
        eyebrow="Configuration"
        title="Settings"
        text="Manage platform and payment settings."
      />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form
            onSubmit={saveSettings}
            className="rounded-2xl bg-white p-7 ring-1 ring-navy-950/5"
          >
            <div>
              <p className="section-label">Platform configuration</p>

              <h2 className="mt-2 font-display text-3xl text-navy-950">
                Platform settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                These settings control the information students see during
                the booking and payment process.
              </p>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block text-sm font-semibold">
                Platform name

                <input
                  className="input-field mt-2"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="PPSU Events"
                  required
                />
              </label>

              <label className="block text-sm font-semibold">
                UPI ID

                <input
                  className="input-field mt-2"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="example@upi"
                />

                <span className="mt-2 block text-xs font-normal text-muted">
                  Students will use this UPI ID when paying by UPI.
                </span>
              </label>

              <div className="rounded-2xl border border-navy-950/10 bg-white p-5">
  <div>
    <p className="text-sm font-semibold">
      UPI QR Code
    </p>

    <p className="mt-1 text-xs font-normal text-muted">
      Upload the QR code students will scan to make a UPI payment.
      PNG, JPG, and WebP images up to 5 MB are supported.
    </p>
  </div>

  <label className="mt-4 block">
    <span className="sr-only">
      Upload UPI QR code
    </span>

    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        setQrFile(file);
      }}
      className="block w-full cursor-pointer rounded-xl border border-navy-950/10 bg-ivory p-3 text-sm"
    />
  </label>

  {qrFile && (
    <p className="mt-3 text-xs text-muted">
      Selected: <strong>{qrFile.name}</strong>
    </p>
  )}

  {upiQrUrl && (
    <div className="mt-5 rounded-2xl border border-navy-950/10 bg-ivory p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">
        Current QR code
      </p>

      <div className="mt-4 flex justify-center">
        <img
          src={upiQrUrl}
          alt="Current UPI payment QR code"
          className="h-52 w-52 rounded-xl bg-white object-contain p-3 shadow-sm ring-1 ring-navy-950/10"
        />
      </div>
    </div>
  )}
</div>

              {upiQrUrl && (
                <div className="rounded-2xl border border-navy-950/10 bg-ivory p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    QR preview
                  </p>

                  <div className="mt-4 flex justify-center">
                    <img
                      src={upiQrUrl}
                      alt="UPI payment QR code preview"
                      className="h-48 w-48 rounded-xl bg-white object-contain p-3 ring-1 ring-navy-950/10"
                    />
                  </div>
                </div>
              )}

              <label className="block text-sm font-semibold">
                Default reservation expiry

                <div className="mt-2 flex items-center gap-3">
                  <input
                    className="input-field"
                    type="number"
                    min="1"
                    value={reservationHours}
                    onChange={(e) =>
                      setReservationHours(e.target.value)
                    }
                    required
                  />

                  <span className="text-sm text-muted">
                    hours
                  </span>
                </div>
              </label>
            </div>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary mt-7 w-full disabled:opacity-50"
            >
              {uploadingQr
  ? 'Uploading QR…'
  : saving
    ? 'Saving…'
    : 'Save settings'}
            </button>
          </form>

          <div className="h-fit rounded-2xl bg-navy-950 p-7 text-white">
            <p className="section-label text-gold-200">
              Payment configuration
            </p>

            <h2 className="mt-2 font-display text-3xl">
              Manual payment
            </h2>

            <p className="mt-4 text-sm leading-7 text-white/60">
              Payment is currently handled manually. Students will
              eventually be able to choose between UPI and cash when
              submitting their payment.
            </p>

            <div className="mt-7 space-y-3">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-gold-200">
                  UPI
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {upiId || 'Not configured'}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-gold-200">
                  Cash
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Available for manual approval
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-xs leading-5 text-white/40">
                Payments are not automatically approved. An authorized
                administrator must review and approve submitted payments.
              </p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}