import { z } from 'zod';

export const ppsuEmailRegex = /^[a-zA-Z0-9._%+-]+@ppsu\.ac\.in$/;

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z
  .object({
    full_name: z.string().min(2, 'Enter your full name'),
    student_id: z.string().min(3, 'Enter your student ID'),
    email: z
      .string()
      .email('Enter a valid PPSU email')
      .regex(ppsuEmailRegex, 'Use your PPSU email (name@ppsu.ac.in)'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Enter a valid PPSU email')
    .regex(ppsuEmailRegex, 'Use your PPSU email (name@ppsu.ac.in)'),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  student_id: z.string().min(3, 'Enter your student ID'),
  email: z
    .string()
    .email('Enter a valid PPSU email')
    .regex(ppsuEmailRegex, 'Use your PPSU email (name@ppsu.ac.in)'),
  phone: z.string().optional(),
});

export const selfBookingSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name is required'),

  student_id: z
    .string()
    .min(1, 'Student ID is required'),

  email: z
    .string()
    .email('Enter a valid email address'),

  partner_name: z.string().optional(),

  partner_student_id: z.string().optional(),

  partner_email: z
    .string()
    .email('Enter a valid partner email address')
    .optional()
    .or(z.literal('')),
});


export const coupleBookingSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  student_id: z.string().min(3, 'Enter your student ID'),
  email: z
    .string()
    .email('Enter a valid PPSU email')
    .regex(ppsuEmailRegex, 'Use a PPSU email (name@ppsu.ac.in)'),

  partner_name: z.string().min(2, 'Enter your partner’s full name'),
  partner_student_id: z
    .string()
    .min(3, 'Enter your partner’s student ID'),
  partner_email: z
    .string()
    .email('Enter a valid PPSU email')
    .regex(ppsuEmailRegex, 'Use a PPSU email (name@ppsu.ac.in)'),
});

export const paymentProofSchema = z.object({
  transaction_reference: z.string().min(3, 'Enter a transaction reference'),
});

export const eventFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  short_description: z.string().min(10, 'Short description must be at least 10 characters'),
  venue: z.string().min(2, 'Enter a venue'),
  address: z.string().optional(),
  event_date: z.string().min(1, 'Select a date'),
  start_time: z.string().min(1, 'Select a start time'),
  end_time: z.string().min(1, 'Select an end time'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  ticket_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  upi_id: z.string().optional(),
  upi_qr_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  banner_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  reservation_expiry_hours: z.coerce.number().int().min(1, 'Must be at least 1 hour'),
  is_featured: z.boolean(),
  status: z.enum(['draft', 'active', 'sold_out', 'completed', 'cancelled']),
});

export const rejectionSchema = z.object({
  reason: z.string().min(3, 'Please provide a rejection reason'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type SelfBookingValues =
  z.infer<typeof selfBookingSchema>;
export type CoupleBookingValues = z.infer<typeof coupleBookingSchema>;
export type PaymentProofValues = z.infer<typeof paymentProofSchema>;
export type EventFormValues = z.infer<typeof eventFormSchema>;
export type RejectionValues = z.infer<typeof rejectionSchema>;
