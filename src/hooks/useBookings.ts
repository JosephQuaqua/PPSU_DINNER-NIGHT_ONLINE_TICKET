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
  ticketType: 'regular' | 'couple';
  selfName: string;
  selfStudentId: string;
  selfEmail: string;
  partnerName?: string;
  partnerStudentId?: string;
  partnerEmail?: string;
}

export function useCreateBooking() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data, error } = await supabase.rpc('create_booking', {
        p_event_id: input.eventId,
        p_user_id: input.userId,
        p_ticket_type: input.ticketType,
        p_self_name: input.selfName,
        p_self_student_id: input.selfStudentId,
        p_self_email: input.selfEmail,
        p_partner_name: input.partnerName ?? null,
        p_partner_student_id: input.partnerStudentId ?? null,
        p_partner_email: input.partnerEmail ?? null,
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Booking could not be created');
      }

      return data[0] as {
        booking_id: string;
        booking_number: string;
        status: string;
        total_amount: number;
        expires_at: string;
      };
    },

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ['events'],
      });

      client.invalidateQueries({
        queryKey: ['bookings'],
      });
    },
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('*, events(*), attendees(*), payments(*), tickets(*)')
        .eq('user_id', user.id)
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
    mutationFn: async ({
      bookingId,
      userId,
      amount,
      transactionReference,
      proofUrl,
    }: {
      bookingId: string;
      userId: string;
      amount: number;
      transactionReference: string;
      proofUrl: string;
    }) => {
      /*
       * Payment does NOT exist when the booking is first created.
       * It is created only when the student actually submits payment.
       */
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          user_id: userId,
          amount,
          payment_method: 'upi',
          transaction_reference: transactionReference,
          proof_url: proofUrl,
          status: 'submitted',
        })
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      /*
       * Only after the payment submission succeeds,
       * move the booking into payment review.
       */
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'payment_submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('user_id', userId);

      if (bookingError) {
        throw bookingError;
      }

      return payment as PaymentRow;
    },

    onSuccess: (_data, variables) => {
      client.invalidateQueries({
        queryKey: ['booking', variables.bookingId],
      });

      client.invalidateQueries({
        queryKey: ['bookings'],
      });
    },
  });
}

export async function getExistingPayment(
  booking: BookingWithDetails
): Promise<PaymentRow | null> {
  const existing = booking.payments?.[0];

  return existing ?? null;
}
export type { EventRow, AttendeeRow, TicketRow };
