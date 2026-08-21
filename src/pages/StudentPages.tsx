import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Download,
  FileCheck2,
  MapPin,
  Ticket,
  Upload,
  UserRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

import { useAuth } from '@/hooks/useAuth';
import {
  useBooking,
  useCreateBooking,
  useMyBookings,
  useSubmitPaymentProof,
  getExistingPayment,
} from '@/hooks/useBookings';
import { useEvent } from '@/hooks/useEvents';
import { supabase } from '@/lib/supabase/client';
import { uploadPaymentProof } from '@/lib/supabase/storage';
import {
  selfBookingSchema,
  paymentProofSchema,
  type SelfBookingValues,
  type PaymentProofValues,
} from '@/lib/validation/schemas';
import {
  EventMeta,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '@/components/ui';
import {
  formatCurrency,
  formatDate,
  formatTime,
} from '@/lib/utils/format';
import type { BookingWithDetails } from '@/types/database';

/* =========================================================
   DASHBOARD SHELL
========================================================= */

function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-ivory pt-20">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="section-label">Student space</p>

            <h1 className="mt-3 text-5xl text-navy-950">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-3 text-muted">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-navy-950">
                {profile?.full_name || 'PPSU student'}
              </p>

              <p className="text-xs text-muted">
                {profile?.student_id || profile?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void signOut();
                nav('/');
              }}
              className="btn-ghost border border-navy-950/10"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="scrollbar-hide mb-10 flex gap-2 overflow-auto border-b border-navy-950/10 pb-3">
          <Link
            className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-950/5"
            to="/dashboard"
          >
            Overview
          </Link>

          <Link
            className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-950/5"
            to="/dashboard/bookings"
          >
            My bookings
          </Link>

          <Link
            className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-950/5"
            to="/dashboard/profile"
          >
            Profile
          </Link>
        </nav>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Ticket;
}) {
  return (
    <div className="card p-5">
      <Icon
        className="text-gold-500"
        size={20}
      />

      <p className="mt-5 text-xs uppercase tracking-widest text-muted">
        {label}
      </p>

      <p className="mt-1 font-display text-3xl text-navy-950">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   BOOKING LIST
========================================================= */

function BookingList({
  bookings,
}: {
  bookings: BookingWithDetails[];
}) {
  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const event = booking.events;

        return (
          <Link
            key={booking.id}
            to={`/dashboard/bookings/${booking.id}`}
            className="card group flex flex-col gap-5 p-5 transition hover:-translate-y-0.5 hover:shadow-lg md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="hidden h-16 w-20 overflow-hidden rounded-xl bg-navy-950 sm:block">
                <img
                  className="h-full w-full object-cover"
                  src={event?.banner_url || ''}
                  alt=""
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold-600">
                  {booking.booking_number}
                </p>

                <h3 className="mt-1 font-display text-2xl text-navy-950">
                  {event?.title || 'PPSU Event'}
                </h3>

                <p className="mt-1 text-sm text-muted">
                  {booking.attendee_count}{' '}
                  attendee
                  {booking.attendee_count !== 1 ? 's' : ''}{' '}
                  · {formatCurrency(booking.total_amount)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-5 md:justify-end">
              <StatusBadge status={booking.status} />

              <ArrowRight
                className="text-muted transition group-hover:translate-x-1"
                size={18}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* =========================================================
   DASHBOARD PAGE
========================================================= */

export function DashboardPage() {
  const {
    data: bookings = [],
    isLoading,
  } = useMyBookings();

  const confirmed = bookings.filter(
    (booking) => booking.status === 'confirmed',
  );

  const pending = bookings.filter((booking) =>
    [
      'payment_pending',
      'payment_submitted',
      'payment_rejected',
    ].includes(booking.status),
  );

  return (
    <DashboardShell
      title="Welcome back."
      subtitle="Your experiences, bookings, and tickets in one place."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Upcoming events"
          value={confirmed.length}
          icon={CalendarDays}
        />

        <Stat
          label="My bookings"
          value={bookings.length}
          icon={FileCheck2}
        />

        <Stat
          label="Confirmed tickets"
          value={confirmed.reduce(
            (sum, booking) =>
              sum + (booking.tickets?.length || 0),
            0,
          )}
          icon={Ticket}
        />

        <Stat
          label="Pending payments"
          value={pending.length}
          icon={CreditCard}
        />
      </div>

      <div className="mt-12 flex items-center justify-between">
        <div>
          <p className="section-label">
            Your activity
          </p>

          <h2 className="mt-2 font-display text-3xl text-navy-950">
            Recent bookings
          </h2>
        </div>

        <Link
          to="/events"
          className="btn-primary px-5 py-2.5"
        >
          Find an event
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <LoadingState />
        ) : bookings.length ? (
          <BookingList
            bookings={bookings.slice(0, 5)}
          />
        ) : (
          <EmptyState
            title="Your next memory starts here"
            text="Explore the PPSU calendar and find something worth showing up for."
            action={
              <Link
                to="/events"
                className="btn-primary"
              >
                Explore events
              </Link>
            }
          />
        )}
      </div>
    </DashboardShell>
  );
}

/* =========================================================
   BOOKINGS PAGE
========================================================= */

export function BookingsPage() {
  const {
    data: bookings = [],
    isLoading,
  } = useMyBookings();

  const [filter, setFilter] =
    useState('all');

  const filtered = bookings.filter(
    (booking) => {
      if (filter === 'all') {
        return true;
      }

      if (
        filter === 'pending' &&
        booking.status === 'payment_pending'
      ) {
        return true;
      }

      if (
        filter === 'review' &&
        booking.status === 'payment_submitted'
      ) {
        return true;
      }

      if (
        filter === 'confirmed' &&
        booking.status === 'confirmed'
      ) {
        return true;
      }

      if (
        filter === 'cancelled' &&
        ['cancelled', 'expired'].includes(
          booking.status,
        )
      ) {
        return true;
      }

      return false;
    },
  );

  const filters = [
    ['all', 'All'],
    ['pending', 'Pending payment'],
    ['review', 'Payment review'],
    ['confirmed', 'Confirmed'],
    ['cancelled', 'Cancelled'],
  ];

  return (
    <DashboardShell
      title="My bookings"
      subtitle="Keep track of every moment you have reserved."
    >
      <div className="scrollbar-hide flex gap-2 overflow-auto border-b border-navy-950/10 pb-3">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              filter === value
                ? 'bg-navy-950 text-white'
                : 'text-muted hover:bg-navy-950/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {isLoading ? (
          <LoadingState />
        ) : filtered.length ? (
          <BookingList bookings={filtered} />
        ) : (
          <EmptyState
            title="No bookings here"
            text="There is nothing in this view yet."
            action={
              <Link
                to="/events"
                className="btn-primary"
              >
                Explore events
              </Link>
            }
          />
        )}
      </div>
    </DashboardShell>
  );
}

/* =========================================================
   FIELD
========================================================= */

const Field = React.forwardRef<
  HTMLInputElement,
  {
    label: string;
    error?: string;
  } & React.InputHTMLAttributes<HTMLInputElement>
>(({ label, error, ...props }, ref) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-navy-950">
        {label}
      </span>

      <input
        ref={ref}
        className={`input-field ${
          error ? 'border-red-400' : ''
        }`}
        {...props}
      />

      {error && (
        <span className="mt-1.5 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
});

Field.displayName = 'Field';

/* =========================================================
   BOOKING PAGE
========================================================= */

export function BookingPage() {
  const { slug } = useParams();
  const { data: event, isLoading } = useEvent(slug);
  const { user, profile } = useAuth();
  const create = useCreateBooking();
  const nav = useNavigate();

  const [ticketType, setTicketType] = useState<'regular' | 'couple'>(
    'regular'
  );

  const form = useForm<SelfBookingValues>({
    resolver: zodResolver(selfBookingSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      student_id: profile?.student_id || '',
      email: profile?.email || user?.email || '',
      partner_name: '',
      partner_student_id: '',
      partner_email: '',
    },
  });

  useEffect(() => {
    form.reset({
      full_name: profile?.full_name || '',
      student_id: profile?.student_id || '',
      email: profile?.email || user?.email || '',
      partner_name: '',
      partner_student_id: '',
      partner_email: '',
    });
  }, [profile, user, form]);

  if (isLoading || !event) {
    return (
      <div className="pt-28">
        <LoadingState />
      </div>
    );
  }

const submit = async (
  values: SelfBookingValues,
) => {
  try {
    if (ticketType === 'couple') {
      if (!values.partner_name?.trim()) {
        form.setError('partner_name', {
          type: 'manual',
          message: 'Partner name is required',
        });
        return;
      }

      if (!values.partner_student_id?.trim()) {
        form.setError('partner_student_id', {
          type: 'manual',
          message: 'Partner student ID is required',
        });
        return;
      }

      if (!values.partner_email?.trim()) {
        form.setError('partner_email', {
          type: 'manual',
          message: 'Partner email is required',
        });
        return;
      }
    }

    const result = await create.mutateAsync({
      eventId: event.id,
      userId: user?.id || '',
      ticketType,
      selfName: values.full_name,
      selfStudentId: values.student_id,
      selfEmail: values.email,

      partnerName:
        ticketType === 'couple'
          ? values.partner_name
          : undefined,

      partnerStudentId:
        ticketType === 'couple'
          ? values.partner_student_id
          : undefined,

      partnerEmail:
        ticketType === 'couple'
          ? values.partner_email
          : undefined,
    });

    // ...keep the rest of your existing code

      const booking = await supabase
        .from('bookings')
        .select('*, events(*), attendees(*), payments(*)')
        .eq('id', result.booking_id)
        .single();

      if (booking.error || !booking.data) {
        throw booking.error || new Error('Booking could not be loaded');
      }

      await getExistingPayment(
        booking.data as BookingWithDetails
      );

      nav(
        `/dashboard/bookings/${result.booking_id}/payment`
      );
    } catch (error) {
      console.error('BOOKING CREATION ERROR:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        error,
      });
    }
  };

  return (
    <div className="min-h-screen bg-ivory px-6 pb-20 pt-32 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/events/${event.slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy-950"
        >
          <ArrowLeft size={16} />
          Back to event
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gold-600">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-400 text-navy-950">
                01
              </span>

              Attendees

              <span className="h-px w-8 bg-gold-400" />

              <span className="text-muted">
                02 Payment
              </span>

              <span className="h-px w-8 bg-navy-950/15" />

              <span className="text-muted">
                03 Confirmation
              </span>
            </div>

            <h1 className="mt-8 text-5xl text-navy-950 md:text-6xl">
              Who’s attending?
            </h1>

            <p className="mt-4 text-muted">
              Reserve your place for {event.title}.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTicketType('regular')}
                className={`rounded-2xl border p-5 text-left transition ${
                  ticketType === 'regular'
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-navy-950/10 bg-white hover:border-gold-300'
                }`}
              >
                <Ticket
                  size={20}
                  className="text-gold-500"
                />

                <strong className="mt-4 block text-sm text-navy-950">
                  Regular ticket
                </strong>

                <span className="mt-1 block text-xs leading-5 text-muted">
                  One attendee. Your personal event ticket.
                </span>

                <span className="mt-4 block font-display text-2xl text-navy-950">
                  {formatCurrency(
                    event.regular_ticket_price
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTicketType('couple')}
                className={`rounded-2xl border p-5 text-left transition ${
                  ticketType === 'couple'
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-navy-950/10 bg-white hover:border-gold-300'
                }`}
              >
                <UserRound
                  size={20}
                  className="text-gold-500"
                />

                <strong className="mt-4 block text-sm text-navy-950">
                  Couple ticket
                </strong>

                <span className="mt-1 block text-xs leading-5 text-muted">
                  Two attendees attending together.
                </span>

                <span className="mt-4 block font-display text-2xl text-navy-950">
                  {formatCurrency(
                    event.couple_ticket_price
                  )}
                </span>
              </button>
            </div>

            <form
              onSubmit={form.handleSubmit(submit)}
              className="mt-10 max-w-xl space-y-5"
            >
              <Field
                label="Full name"
                placeholder="Your full name"
                {...form.register('full_name')}
                error={
                  form.formState.errors.full_name?.message
                }
              />

              <Field
                label="Student ID"
                placeholder="PPSU student ID"
                {...form.register('student_id')}
                error={
                  form.formState.errors.student_id?.message
                }
              />

                          <Field
                label="PPSU email"
                type="email"
                placeholder="you@ppsu.ac.in"
                {...form.register('email')}
                error={
                  form.formState.errors.email?.message
                }
              />

              {ticketType === 'couple' && (
                <div className="space-y-5 rounded-2xl border border-gold-400/30 bg-gold-50/50 p-5">
                  <div>
                    <p className="text-sm font-bold text-navy-950">
                      Partner details
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted">
                      Enter the details of the second attendee.
                    </p>
                  </div>

                  <Field
                    label="Partner full name"
                    placeholder="Partner full name"
                    {...form.register('partner_name')}
                    error={
                      form.formState.errors.partner_name?.message
                    }
                  />

                  <Field
                    label="Partner student ID"
                    placeholder="Partner PPSU student ID"
                    {...form.register('partner_student_id')}
                    error={
                      form.formState.errors.partner_student_id?.message
                    }
                  />

                 <Field
  label="Partner email address"
  type="email"
  placeholder="partner@gmail.com"
  {...form.register('partner_email')}
                    error={
                      form.formState.errors.partner_email?.message
                    }
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={create.isPending}
                className="btn-primary w-full sm:w-auto"
              >
                {create.isPending
                  ? 'Creating booking…'
                  : 'Continue to payment'}

                <ArrowRight size={17} />
              </button>

              {create.error && (
                <p className="text-sm text-red-600">
                  We couldn’t create your booking. Please check
                  your details and try again.
                </p>
              )}
            </form>
          </div>

          <aside className="h-fit rounded-[24px] bg-white p-6 shadow-xl shadow-navy-950/5 ring-1 ring-navy-950/5 lg:sticky lg:top-28">
            <img
              src={event.banner_url || ''}
              alt=""
              className="aspect-[1.7] w-full rounded-2xl object-cover"
            />

            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gold-600">
              Your reservation
            </p>

            <h2 className="mt-2 font-display text-2xl text-navy-950">
              {event.title}
            </h2>

            <div className="mt-5 space-y-3 text-sm text-muted">
              <p className="flex gap-3">
                <CalendarDays
                  size={17}
                  className="text-gold-500"
                />
                {formatDate(event.event_date)}
              </p>

              <p className="flex gap-3">
                <MapPin
                  size={17}
                  className="text-gold-500"
                />
                {event.venue}
              </p>
            </div>

            <div className="mt-6 border-t border-navy-950/10 pt-6">
              <p className="text-xs uppercase tracking-widest text-muted">
                Ticket type
              </p>

              <p className="mt-2 font-semibold text-navy-950">
                {ticketType === 'couple'
                  ? 'Couple ticket'
                  : 'Regular ticket'}
              </p>

              <p className="mt-1 font-display text-2xl text-navy-950">
                {formatCurrency(
                  ticketType === 'couple'
                    ? event.couple_ticket_price
                    : event.regular_ticket_price
                )}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAYMENT PAGE
========================================================= */

export function PaymentPage() {
  const { id } = useParams();

  const {
    data: booking,
    isLoading,
  } = useBooking(id);

  const { user } = useAuth();

  const submit = useSubmitPaymentProof();

  const [paymentMethod, setPaymentMethod] =
    useState<'upi' | 'cash'>('upi');

  const [file, setFile] =
    useState<File | null>(null);

    

  const [cashAmount, setCashAmount] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [
    platformSettings,
    setPlatformSettings,
  ] = useState<{
    upi_id: string | null;
    upi_qr_url: string | null;
  } | null>(null);

  const [
    settingsLoading,
    setSettingsLoading,
  ] = useState(true);

  useEffect(() => {
    const loadPlatformSettings =
      async () => {
        setSettingsLoading(true);

        const { data, error } =
          await supabase
            .rpc('get_payment_settings')
            .maybeSingle();

        if (error) {
          console.error(
            'PLATFORM SETTINGS LOAD ERROR:',
            error,
          );

          setPlatformSettings(null);
        } else {
          setPlatformSettings(
            data as {
              upi_id: string | null;
              upi_qr_url: string | null;
            } | null,
          );
        }

        setSettingsLoading(false);
      };

    void loadPlatformSettings();
  }, []);

  const form =
  useForm<PaymentProofValues>({
    resolver: zodResolver(
      paymentProofSchema,
    ),
    defaultValues: {
      payment_method: 'upi',
      transaction_reference: '',
      cash_amount: undefined,
    },
  });

  if (isLoading) {
    return (
      <DashboardShell title="Complete your payment">
        <LoadingState />
      </DashboardShell>
    );
  }

  if (!booking || !booking.events) {
    return (
      <DashboardShell title="Booking not found">
        <EmptyState
          title="We couldn't find that booking"
          text="Return to your bookings and try again."
        />
      </DashboardShell>
    );
  }

  const event = booking.events;

  const submitProof = async (
  values: PaymentProofValues,
) => {
  console.log('PAYMENT FORM VALUES:', values);
  console.log('PAYMENT METHOD STATE:', paymentMethod);
  console.log('CASH AMOUNT STATE:', cashAmount);

  setMessage('');

    /*
     * ============================
     * UPI VALIDATION
     * ============================
     */
    if (paymentMethod === 'upi') {
      if (!values.transaction_reference?.trim()) {
        setMessage(
          'Please enter your UPI transaction ID.',
        );

        return;
      }

      if (!file) {
        setMessage(
          'Please upload your payment screenshot.',
        );

        return;
      }
    }

    /*
     * ============================
     * CASH VALIDATION
     * ============================
     */
    if (paymentMethod === 'cash') {
      const parsedAmount =
  Number(values.cash_amount);

      if (
       values.cash_amount === undefined ||
        Number.isNaN(parsedAmount) ||
        parsedAmount <= 0
      ) {
        setMessage(
          'Please enter the amount you paid in cash.',
        );

        return;
      }

      if (
        parsedAmount >
        Number(booking.total_amount)
      ) {
        setMessage(
          'Cash amount cannot be greater than the booking amount.',
        );

        return;
      }
    }

    try {
      let proofUrl:
        | string
        | null = null;

      /*
       * Upload screenshot only for UPI.
       */
      if (
        paymentMethod === 'upi' &&
        file
      ) {
        proofUrl =
          await uploadPaymentProof(
            file,
            booking.id,
          );

        if (!proofUrl) {
          setMessage(
            'We could not upload that screenshot. Please try again.',
          );

          return;
        }
      }

      /*
       * Cash uses the amount entered by
       * the student.
       *
       * UPI uses the booking total.
       */
      const paymentAmount =
  paymentMethod === 'cash'
    ? Number(values.cash_amount)
    : Number(booking.total_amount);

      await submit.mutateAsync({
        bookingId: booking.id,
        userId:
          user?.id ||
          booking.user_id,
        amount: paymentAmount,
        paymentMethod,
        transactionReference:
          paymentMethod === 'upi'
            ? values.transaction_reference
            : null,
        proofUrl:
          paymentMethod === 'upi'
            ? proofUrl
            : null,
      });

      setMessage(
        paymentMethod === 'cash'
          ? 'Cash payment submitted successfully. Your booking is waiting for admin verification.'
          : 'UPI payment submitted successfully. Your booking is waiting for admin verification.',
      );
    } catch (error) {
      console.error(
        'PAYMENT SUBMISSION ERROR:',
        error,
      );

      setMessage(
        'Unable to submit payment. Please try again.',
      );
    }
  };

  return (
    <DashboardShell
      title="Complete your payment"
      subtitle="Your place is reserved for 24 hours."
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_370px]">
        <div className="rounded-[24px] bg-white p-7 shadow-sm ring-1 ring-navy-950/5 md:p-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="section-label">
                Booking created successfully
              </p>

              <h2 className="mt-3 font-display text-4xl text-navy-950">
                Complete your payment.
              </h2>
            </div>

            <StatusBadge
              status={booking.status}
            />
          </div>

          <div className="mt-10 rounded-2xl bg-ivory p-6">
            <p className="text-xs uppercase tracking-widest text-muted">
              Amount due
            </p>

            <p className="mt-2 font-display text-5xl text-navy-950">
              {formatCurrency(
                booking.total_amount,
              )}
            </p>

            <p className="mt-2 text-sm text-muted">
              Booking {booking.booking_number}
            </p>
          </div>

          {/* ==========================================
              PAYMENT METHOD
          ========================================== */}

          <div className="mt-8">
            <p className="text-sm font-bold text-navy-950">
              Select payment method
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* UPI */}
              <button
                type="button"
                onClick={() => {
  setPaymentMethod('upi');
  form.setValue('payment_method', 'upi');
  form.setValue('cash_amount', undefined);
  setCashAmount('');
  setMessage('');
}}
                className={`rounded-2xl border p-5 text-left transition ${
                  paymentMethod === 'upi'
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-navy-950/10 bg-white hover:border-gold-300'
                }`}
              >
                <CreditCard
                  size={21}
                  className="text-gold-500"
                />

                <strong className="mt-4 block text-sm text-navy-950">
                  UPI Payment
                </strong>

                <span className="mt-1 block text-xs leading-5 text-muted">
                  Pay using UPI and upload your
                  transaction proof.
                </span>
              </button>

              {/* CASH */}
              <button
                type="button"
               onClick={() => {
  setPaymentMethod('cash');
  form.setValue('payment_method', 'cash');
  form.setValue('transaction_reference', '');
  form.setValue('cash_amount', undefined);
  setMessage('');
}}
                className={`rounded-2xl border p-5 text-left transition ${
                  paymentMethod === 'cash'
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-navy-950/10 bg-white hover:border-gold-300'
                }`}
              >
                <CreditCard
                  size={21}
                  className="text-gold-500"
                />

                <strong className="mt-4 block text-sm text-navy-950">
                  Cash Payment
                </strong>

                <span className="mt-1 block text-xs leading-5 text-muted">
                  Pay cash and enter the amount
                  handed over.
                </span>
              </button>
            </div>
          </div>

          {/* ==========================================
              UPI INSTRUCTIONS
          ========================================== */}

          {paymentMethod === 'upi' && (
            <div className="mt-8">
              <p className="text-sm font-bold text-navy-950">
                UPI payment instructions
              </p>

              <p className="mt-2 text-sm leading-6 text-muted">
                Pay the exact booking amount using
                the UPI ID below, then enter your
                transaction ID and upload your
                payment screenshot.
              </p>

              <div className="mt-5 rounded-xl border border-gold-400/30 bg-gold-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">
                    UPI ID
                  </span>

                  <strong className="text-sm text-navy-950">
                    {settingsLoading
                      ? 'Loading…'
                      : platformSettings?.upi_id ||
                        'UPI ID not configured'}
                  </strong>
                </div>

                {platformSettings?.upi_qr_url && (
                  <div className="mt-6 flex justify-center border-t border-gold-400/20 pt-6">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <img
                        src={
                          platformSettings.upi_qr_url
                        }
                        alt="UPI payment QR code"
                        className="h-56 w-56 object-contain"
                      />
                    </div>
                  </div>
                )}

                {!settingsLoading &&
                  !platformSettings?.upi_qr_url && (
                    <p className="mt-4 text-center text-xs text-muted">
                      UPI QR code is not currently
                      configured.
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* ==========================================
              CASH INSTRUCTIONS
          ========================================== */}

          {paymentMethod === 'cash' && (
            <div className="mt-8 rounded-xl border border-gold-400/30 bg-gold-50 p-5">
              <p className="text-sm font-bold text-navy-950">
                Cash payment
              </p>

              <p className="mt-2 text-sm leading-6 text-muted">
                Enter the amount you have paid in
                cash. Your payment will remain
                pending until an administrator
                verifies the cash payment.
              </p>

              <div className="mt-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-navy-950">
                    Amount paid
                    <span className="ml-1 text-red-600">
                      *
                    </span>
                  </span>

                  <input
  type="number"
  min="0"
  max={booking.total_amount}
  step="0.01"
  className="input-field"
  placeholder="Enter cash amount"
  {...form.register('cash_amount', {
    valueAsNumber: true,
  })}
/>
                </label>

                {form.formState.errors.cash_amount && (
  <span className="mt-1.5 block text-xs text-red-600">
    {form.formState.errors.cash_amount.message}
  </span>
)}



                <p className="mt-2 text-xs text-muted">
                  Booking amount:{' '}
                  {formatCurrency(
                    booking.total_amount,
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ==========================================
              SUBMISSION FORM
          ========================================== */}

          {message ? (
            <div className="mt-8 flex items-start gap-3 rounded-xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
              <Check size={18} />
              <span>{message}</span>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(
                submitProof,
              )}
              className="mt-10 space-y-5"
            >
              {/* UPI FIELDS */}
              {paymentMethod === 'upi' && (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-navy-950">
                      Transaction reference
                      <span className="ml-1 text-red-600">
                        *
                      </span>
                    </span>

                    <input
                      className="input-field"
                      placeholder="Enter UPI transaction ID"
                      {...form.register(
                        'transaction_reference',
                      )}
                    />

                    {form.formState.errors
                      .transaction_reference && (
                      <span className="mt-1.5 block text-xs text-red-600">
                        {
                          form.formState.errors
                            .transaction_reference
                            .message
                        }
                      </span>
                    )}
                  </label>

                  <label className="block cursor-pointer">
                    <span className="mb-2 block text-sm font-semibold text-navy-950">
                      Payment screenshot
                      <span className="ml-1 text-red-600">
                        *
                      </span>
                    </span>

                    <div
                      className={`flex items-center gap-3 rounded-xl border border-dashed bg-ivory px-4 py-5 text-sm transition ${
                        file
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-navy-950/20 hover:border-gold-400'
                      }`}
                    >
                      <Upload
                        size={19}
                        className={
                          file
                            ? 'text-emerald-600'
                            : 'text-gold-500'
                        }
                      />

                      <span className="flex-1">
                        {file
                          ? file.name
                          : 'Upload payment screenshot'}
                      </span>

                      <input
                        className="sr-only"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={(e) => {
                          const selectedFile =
                            e.target.files?.[0] ||
                            null;

                          setFile(
                            selectedFile,
                          );
                        }}
                      />
                    </div>

                    {!file && (
                      <span className="mt-1.5 block text-xs text-muted">
                        Payment screenshot is required.
                      </span>
                    )}

                    {file && (
                      <span className="mt-1.5 block text-xs text-emerald-700">
                        Payment screenshot selected.
                      </span>
                    )}
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={
                  submit.isPending
                }
                className="btn-primary w-full"
              >
                {submit.isPending
                  ? 'Submitting…'
                  : paymentMethod === 'cash'
                    ? 'Submit cash payment'
                    : 'Submit UPI payment proof'}

                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>

        {/* ==========================================
            BOOKING SIDEBAR
        ========================================== */}

        <aside className="h-fit rounded-[24px] bg-navy-950 p-7 text-white lg:sticky lg:top-28">
          <p className="section-label text-gold-200">
            Your booking
          </p>

          <h2 className="mt-4 font-display text-3xl">
            {event.title}
          </h2>

          <div className="mt-7 space-y-4 text-sm text-white/65">
            <p className="flex justify-between">
              <span>Booking number</span>

              <strong className="text-white">
                {booking.booking_number}
              </strong>
            </p>

            <p className="flex justify-between">
              <span>Tickets</span>

              <strong className="text-white">
                {booking.attendee_count}
              </strong>
            </p>

            <p className="flex justify-between">
              <span>Payment method</span>

              <strong className="text-gold-200">
                {paymentMethod === 'upi'
                  ? 'UPI'
                  : 'Cash'}
              </strong>
            </p>

            <p className="flex justify-between">
              <span>Amount</span>

              <strong className="text-white">
                {paymentMethod === 'cash' &&
                cashAmount
                  ? formatCurrency(
                      Number(cashAmount),
                    )
                  : formatCurrency(
                      booking.total_amount,
                    )}
              </strong>
            </p>

            <p className="flex justify-between">
              <span>Deadline</span>

              <strong className="text-gold-200">
                {booking.expires_at
                  ? formatDate(
                      booking.expires_at,
                    )
                  : '24 hours'}
              </strong>
            </p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-xs leading-6 text-white/45">
              Your booking appears immediately
              in the PPSU Events admin payment
              queue. Confirmation and ticket
              issuance happen after verification.
            </p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}

/* =========================================================
   BOOKING DETAIL PAGE
========================================================= */

export function BookingDetailPage() {
  const { id } = useParams();

  const {
    data: booking,
    isLoading,
  } = useBooking(id);

  if (isLoading) {
    return (
      <DashboardShell title="Booking details">
        <LoadingState />
      </DashboardShell>
    );
  }

  if (
    !booking ||
    !booking.events
  ) {
    return (
      <DashboardShell title="Booking details">
        <EmptyState
          title="Booking not found"
          text="This booking may no longer be available."
        />
      </DashboardShell>
    );
  }

  const event = booking.events;

  return (
    <DashboardShell title="Booking details">
      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <div className="card p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-label">
                  {booking.booking_number}
                </p>

                <h2 className="mt-2 font-display text-4xl text-navy-950">
                  {event.title}
                </h2>

                <p className="mt-2 text-sm text-muted">
                  Created{' '}
                  {formatDate(
                    booking.created_at,
                  )}
                </p>
              </div>

              <StatusBadge
                status={booking.status}
              />
            </div>

            <div className="mt-8">
              <EventMeta event={event} />
            </div>
          </div>

          <div className="card p-7">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-navy-950">
                Attendees
              </h3>

              <span className="text-sm text-muted">
                {booking.attendee_count}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {booking.attendees?.map(
                (attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center justify-between rounded-xl bg-ivory p-4"
                  >
                    <div>
                      <p className="font-semibold text-navy-950">
                        {attendee.full_name}
                      </p>

                      <p className="text-xs text-muted">
                        {attendee.student_id}{' '}
                        · {attendee.email}
                      </p>
                    </div>

                    <Check
                      size={17}
                      className="text-emerald-600"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[24px] bg-navy-950 p-7 text-white">
          <p className="section-label text-gold-200">
            Payment
          </p>

          <p className="mt-3 font-display text-4xl">
            {formatCurrency(
              booking.total_amount,
            )}
          </p>

          <div className="mt-6">
            <StatusBadge
              status={
                booking.payments?.[0]
                  ?.status || 'pending'
              }
            />
          </div>

          {[
            'payment_pending',
            'payment_rejected',
          ].includes(
            booking.status,
          ) && (
            <Link
              to={`/dashboard/bookings/${booking.id}/payment`}
              className="btn-primary mt-7 w-full"
            >
              Continue to payment
              <ArrowRight size={16} />
            </Link>
          )}

          {booking.tickets?.length ? (
            <Link
              to={`/dashboard/tickets/${booking.tickets[0].id}`}
              className="btn-outline mt-3 w-full"
            >
              View digital ticket
              <Ticket size={16} />
            </Link>
          ) : null}
        </aside>
      </div>
    </DashboardShell>
  );
}

/* =========================================================
   TICKET PAGE
========================================================= */

export function TicketPage() {
  const { id } = useParams();

  const {
    data: bookings = [],
  } = useMyBookings();

  const [avatarUrl, setAvatarUrl] =
    useState<string | null>(null);

  const ticket = bookings
    .flatMap((booking) =>
      (booking.tickets || []).map(
        (ticket) => ({
          t: ticket,
          b: booking,
        }),
      ),
    )
    .find(
      ({ t }) => t.id === id,
    );

  useEffect(() => {
    const loadAvatar =
      async () => {
        if (!ticket?.b.user_id) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq(
            'id',
            ticket.b.user_id,
          )
          .maybeSingle();

        if (error) {
          console.error(
            'PROFILE AVATAR ERROR:',
            error,
          );
          return;
        }

        if (!data?.avatar_url) {
          setAvatarUrl(null);
          return;
        }

        try {
          const response =
            await fetch(
              data.avatar_url,
            );

          if (!response.ok) {
            throw new Error(
              `Avatar request failed: ${response.status}`,
            );
          }

          const blob =
            await response.blob();

          const reader =
            new FileReader();

          reader.onloadend = () => {
            if (
              typeof reader.result ===
              'string'
            ) {
              setAvatarUrl(
                reader.result,
              );
            }
          };

          reader.readAsDataURL(
            blob,
          );
        } catch (error) {
          console.error(
            'AVATAR LOAD ERROR:',
            error,
          );

          setAvatarUrl(null);
        }
      };

    void loadAvatar();
  }, [ticket?.b.user_id]);

  if (!ticket) {
    return (
      <DashboardShell title="Digital ticket">
        <LoadingState />
      </DashboardShell>
    );
  }

  const { t, b } = ticket;

  const event = b.events;

  const attendee =
  b.attendees?.find(
    (item) =>
      item.id === t.attendee_id,
  );

const partnerAttendee =
  b.attendees?.find(
    (item) =>
      item.id !== t.attendee_id,
  );

const isCoupleTicket =
  b.ticket_type === 'couple';

  const waitForImages = async (
    element: HTMLElement,
  ) => {
    const images = Array.from(
      element.querySelectorAll('img'),
    );

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>(
            (resolve) => {
              if (
                img.complete &&
                img.naturalWidth > 0
              ) {
                resolve();
                return;
              }

              img.onload = () =>
                resolve();

              img.onerror = () =>
                resolve();
            },
          ),
      ),
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          300,
        ),
    );
  };

  const downloadTicketImage =
    async () => {
      const ticketElement =
        document.getElementById(
          'printable-ticket',
        );

      if (!ticketElement) {
        console.error(
          'Ticket element not found',
        );
        return;
      }

      try {
        await waitForImages(
          ticketElement,
        );

        const rect =
          ticketElement.getBoundingClientRect();

        const dataUrl =
          await toPng(
            ticketElement,
            {
              pixelRatio: 1,
              cacheBust: true,
              backgroundColor:
                '#FFFFFF',
              skipFonts: true,
              width: Math.round(
                rect.width,
              ),
              height: Math.round(
                rect.height,
              ),
            },
          );

        const response =
          await fetch(dataUrl);

        const blob =
          await response.blob();

        if (
          /iPhone|iPad|iPod/i.test(
            navigator.userAgent,
          ) &&
          navigator.share
        ) {
          const file =
            new File(
              [
                blob,
              ],
              `PPSU-Ticket-${t.ticket_number}.png`,
              {
                type: 'image/png',
              },
            );

          if (
            navigator.canShare &&
            navigator.canShare({
              files: [file],
            })
          ) {
            await navigator.share({
              files: [file],
              title:
                'PPSU Digital Ticket',
            });

            return;
          }
        }

        const link =
          document.createElement(
            'a',
          );

        link.download =
          `PPSU-Ticket-${t.ticket_number}.png`;

        link.href = dataUrl;

        link.click();
      } catch (error) {
        console.error(
          'TICKET IMAGE DOWNLOAD ERROR:',
          error,
        );
      }
    };

  const downloadTicketPDF =
    async () => {
      const ticketElement =
        document.getElementById(
          'printable-ticket',
        );

      if (!ticketElement) {
        console.error(
          'Ticket element not found',
        );
        return;
      }

      try {
        await waitForImages(
          ticketElement,
        );

        const dataUrl =
          await toPng(
            ticketElement,
            {
              pixelRatio: 1,
              cacheBust: true,
              backgroundColor:
                '#FFFFFF',
             skipFonts: true,
            },
          );

        const image =
          new Image();

        await new Promise<void>(
          (
            resolve,
            reject,
          ) => {
            image.onload = () =>
              resolve();

            image.onerror =
              reject;

            image.src =
              dataUrl;
          },
        );

        const pdf =
          new jsPDF({
            orientation:
              'portrait',
            unit: 'px',
            format: 'a4',
          });

        const pdfWidth =
          pdf.internal.pageSize.getWidth();

        const pdfHeight =
          pdf.internal.pageSize.getHeight();

        const margin = 40;

        const ratio =
          Math.min(
            (pdfWidth -
              margin * 2) /
              image.width,
            (pdfHeight -
              margin * 2) /
              image.height,
          );

        const width =
          image.width * ratio;

        const height =
          image.height * ratio;

        const x =
          (pdfWidth -
            width) /
          2;

        const y =
          (pdfHeight -
            height) /
          2;

        pdf.addImage(
          dataUrl,
          'PNG',
          x,
          y,
          width,
          height,
        );

        const pdfBlob =
          pdf.output('blob');

        if (
          /iPhone|iPad|iPod/i.test(
            navigator.userAgent,
          ) &&
          navigator.share
        ) {
          const file =
            new File(
              [
                pdfBlob,
              ],
              `PPSU-Ticket-${t.ticket_number}.pdf`,
              {
                type: 'application/pdf',
              },
            );

          if (
            navigator.canShare &&
            navigator.canShare({
              files: [file],
            })
          ) {
            await navigator.share({
              files: [file],
              title:
                'PPSU Digital Ticket',
            });

            return;
          }
        }

        pdf.save(
          `PPSU-Ticket-${t.ticket_number}.pdf`,
        );
      } catch (error) {
        console.error(
          'TICKET PDF DOWNLOAD ERROR:',
          error,
        );
      }
    };

  return (
    <DashboardShell
      title="Digital ticket"
      subtitle="Keep this pass ready for entry."
    >
      <div className="mx-auto max-w-2xl">
        <div
          id="printable-ticket"
          className="overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-navy-950/5"
        >
          <div className="relative bg-navy-950 p-8 text-white md:p-12">
            <div className="absolute right-8 top-8 h-24 w-24 overflow-hidden rounded-full border-2 border-gold-400/40 bg-ivory">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={
                    attendee?.full_name ||
                    'Attendee'
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserRound
                    size={32}
                    className="text-navy-950/30"
                  />
                </div>
              )}
            </div>

            <p className="text-xs font-bold tracking-[.25em] text-gold-200">
              PPSU EVENTS
            </p>

            <h1 className="mt-14 max-w-md font-display text-5xl leading-none md:text-6xl">
              {event?.title}
            </h1>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/65">
              <span>
                {event
                  ? formatDate(
                      event.event_date,
                    )
                  : ''}
              </span>

              <span>
                {event
                  ? formatTime(
                      event.start_time,
                    )
                  : ''}
              </span>

              <span>
                {event?.venue?.split(
                  ',',
                )[0]}
              </span>
            </div>
          </div>

          <div className="grid gap-8 p-8 md:grid-cols-[1fr_160px] md:p-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                Attendee
              </p>

              <div className="mt-3">
  <p className="font-display text-3xl text-navy-950">
    {attendee?.full_name}
  </p>

  <p className="mt-1 text-sm text-muted">
    {attendee?.student_id}
  </p>

  {isCoupleTicket && partnerAttendee && (
    <div className="mt-5 border-t border-navy-950/10 pt-5">
      <p className="text-xs uppercase tracking-widest text-muted">
        Partner
      </p>

      <p className="mt-2 font-display text-2xl text-navy-950">
        {partnerAttendee.full_name}
      </p>

      <p className="mt-1 text-sm text-muted">
        {partnerAttendee.student_id}
      </p>
    </div>
  )}
</div>
              <div className="mt-10">
                <p className="text-xs uppercase tracking-widest text-muted">
                  Ticket number
                </p>

                <p className="mt-2 font-mono text-lg font-bold text-navy-950">
                  {t.ticket_number}
                </p>

                <div className="mt-4">
                  <StatusBadge
                    status={t.status}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-ivory p-4">
              <QRCodeSVG
                value={t.qr_token}
                size={128}
                bgColor="#F8F5F0"
                fgColor="#071A2B"
              />

              <p className="mt-3 text-[10px] uppercase tracking-widest text-muted">
                Scan at entry
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              downloadTicketPDF
            }
            className="btn-primary w-full"
          >
            <Download size={16} />
            Download PDF
          </button>

          <button
            type="button"
            onClick={
              downloadTicketImage
            }
            className="flex w-full items-center justify-center gap-2 rounded-full border border-navy-950/20 bg-white px-6 py-4 font-semibold text-navy-950 transition hover:bg-navy-950 hover:text-white"
          >
            <Download size={16} />
            Download Image
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}

/* =========================================================
   PROFILE PAGE
========================================================= */

export function ProfilePage() {
  const {
    profile,
    refreshProfile,
  } = useAuth();

  const [name, setName] =
    useState(
      profile?.full_name || '',
    );

  const [studentId, setStudentId] =
    useState(
      profile?.student_id || '',
    );

  const [avatarUrl, setAvatarUrl] =
    useState(
      profile?.avatar_url || '',
    );

  const [file, setFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    setName(
      profile?.full_name || '',
    );

    setStudentId(
      profile?.student_id || '',
    );

    setAvatarUrl(
      profile?.avatar_url || '',
    );
  }, [profile]);

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile =
      e.target.files?.[0];

    if (
      !selectedFile ||
      !profile
    ) {
      return;
    }

    setMessage('');

    if (
      !selectedFile.type.startsWith(
        'image/',
      )
    ) {
      setMessage(
        'Please choose an image file.',
      );

      return;
    }

    if (
      selectedFile.size >
      5 * 1024 * 1024
    ) {
      setMessage(
        'Avatar must be smaller than 5MB.',
      );

      return;
    }

    setFile(selectedFile);

    const preview =
      URL.createObjectURL(
        selectedFile,
      );

    setAvatarUrl(preview);
  };

  const uploadAvatar =
    async () => {
      if (
        !file ||
        !profile
      ) {
        return (
          profile?.avatar_url ||
          null
        );
      }

      setUploading(true);

      try {
        const extension =
          file.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg';

        const path =
          `${profile.id}/avatar-${Date.now()}.${extension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from('avatars')
          .upload(
            path,
            file,
            {
              upsert: true,
              contentType:
                file.type,
              cacheControl:
                '3600',
            },
          );

        if (uploadError) {
          console.error(
            'AVATAR UPLOAD ERROR:',
            uploadError,
          );

          throw uploadError;
        }

        const { data } =
          supabase.storage
            .from('avatars')
            .getPublicUrl(
              path,
            );

        return data.publicUrl;
      } finally {
        setUploading(false);
      }
    };

  const save = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      let finalAvatarUrl =
        profile.avatar_url ||
        null;

      if (file) {
        finalAvatarUrl =
          await uploadAvatar();
      }

      const { error } =
        await supabase
          .from('profiles')
          .update({
            full_name: name,
            student_id:
              studentId,
            avatar_url:
              finalAvatarUrl,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            profile.id,
          );

      if (error) {
        console.error(
          'PROFILE UPDATE ERROR:',
          error,
        );

        throw error;
      }

      setAvatarUrl(
        finalAvatarUrl || '',
      );

      setFile(null);

      await refreshProfile();

      setMessage(
        'Profile updated successfully.',
      );
    } catch (error) {
      console.error(
        'PROFILE SAVE ERROR:',
        error,
      );

      setMessage(
        'Unable to save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Your profile"
      subtitle="Keep your PPSU details ready for every booking."
    >
      <div className="grid max-w-4xl gap-8 lg:grid-cols-[280px_1fr]">
        <div className="card flex flex-col items-center p-7">
          <div className="relative">
            <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-gold-400 bg-ivory">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Your profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserRound
                    size={64}
                    className="text-navy-950/30"
                  />
                </div>
              )}
            </div>

            <label
              htmlFor="avatar-upload"
              className="absolute bottom-1 right-1 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-navy-950 text-white shadow-lg transition hover:bg-navy-900"
            >
              <Upload size={18} />
            </label>

            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={
                handleAvatarChange
              }
            />
          </div>

          <h2 className="mt-5 font-display text-2xl text-navy-950">
            Profile photo
          </h2>

          <p className="mt-2 text-center text-sm leading-6 text-muted">
            This photo will appear on
            your digital event ticket.
          </p>

          <label
            htmlFor="avatar-upload"
            className="btn-ghost mt-5 cursor-pointer border border-navy-950/10"
          >
            {file
              ? 'Change photo'
              : 'Choose photo'}
          </label>

          <p className="mt-3 text-center text-xs text-muted">
            JPG, PNG or WebP · Maximum
            5MB
          </p>
        </div>

        <form
          onSubmit={save}
          className="card space-y-5 p-7"
        >
          <div>
            <p className="section-label">
              Personal information
            </p>

            <h2 className="mt-2 font-display text-3xl text-navy-950">
              Student details
            </h2>
          </div>

          <Field
            label="Full name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <Field
            label="Student ID"
            value={studentId}
            onChange={(e) =>
              setStudentId(
                e.target.value,
              )
            }
          />

          <Field
            label="PPSU email"
            value={
              profile?.email || ''
            }
            disabled
          />

          <button
            type="submit"
            disabled={
              saving ||
              uploading
            }
            className="btn-primary"
          >
            {saving || uploading
              ? 'Saving…'
              : 'Save changes'}

            <Check size={16} />
          </button>

          {message && (
            <p
              className={`text-sm ${
                message.includes(
                  'successfully',
                )
                  ? 'text-emerald-700'
                  : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </DashboardShell>
  );
}