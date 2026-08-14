import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type {
  BookingWithDetails,
  AttendeeRow,
  PaymentRow,
  TicketRow,
  EventRow,
  ProfileRow,
} from '@/types/database';

interface CreateBookingInput {
  eventId: string;
  userId: string;
  attendeeCount: number;
  totalAmount: number;
  fullName: string;
  studentId: string;
  email: string;
}

export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data, error } = await supabase.rpc('create_booking', {
        p_event_id: input.eventId,
        p_user_id: input.userId,
        p_attendee_count: input.attendeeCount,
        p_total_amount: input.totalAmount,
        p_self_name: input.fullName,
        p_self_student_id: input.studentId,
        p_self_email: input.email,
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Booking could not be created');
      return data[0] as { booking_id: string; booking_number: string; status: string; total_amount: number; expires_at: string };
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['events'] });
      client.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, events(*), attendees(*), payments(*), tickets(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bookings = (data || []) as unknown as BookingWithDetails[];

      const userIds = [...new Set(bookings.map((booking) => booking.user_id))];

      if (userIds.length === 0) {
        return bookings;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(
        ((profiles || []) as ProfileRow[]).map((profile) => [
          profile.id,
          profile,
        ])
      );

      return bookings.map((booking) => ({
        ...booking,
        profile: profileMap.get(booking.user_id) || null,
      }));
    },
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<BookingWithDetails | null> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, events(*), attendees(*), payments(*), tickets(*)')
        .eq('id', id as string)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const booking = data as unknown as BookingWithDetails;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', booking.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      return {
        ...booking,
        profile: profile as ProfileRow | null,
      };
    },
  });
}

export function useSubmitPaymentProof() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, bookingId, transactionReference, proofUrl }: { paymentId: string; bookingId: string; transactionReference: string; proofUrl: string }) => {
      const { error: paymentError } = await supabase.from('payments').update({
        transaction_reference: transactionReference,
        proof_url: proofUrl,
        status: 'submitted',
      }).eq('id', paymentId).eq('booking_id', bookingId);
      if (paymentError) throw paymentError;
      const { error: bookingError } = await supabase.from('bookings').update({ status: 'payment_submitted' }).eq('id', bookingId);
      if (bookingError) throw bookingError;
      return true;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      client.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export async function ensurePayment(booking: BookingWithDetails): Promise<PaymentRow> {
  const existing = booking.payments?.[0];
  if (existing) return existing;
  const { data, error } = await supabase.from('payments').insert({
    booking_id: booking.id,
    user_id: booking.user_id,
    amount: booking.total_amount,
    payment_method: 'upi',
    status: 'pending',
  }).select().single();
  if (error) throw error;
  return data as PaymentRow;
}

export type { EventRow, AttendeeRow, TicketRow };
