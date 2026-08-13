/*
# PPSU Events — Seed Initial Event

Seeds the PPSU Dinner Night 2026 event with all details from the spec.
Uses ON CONFLICT to be idempotent.
*/

INSERT INTO public.events (
  title, slug, description, short_description, venue, address,
  event_date, start_time, end_time, capacity, tickets_sold, ticket_price,
  upi_id, banner_url, reservation_expiry_hours, status, is_featured
)
VALUES (
  'PPSU Dinner Night 2026',
  'ppsu-dinner-night-2026',
  'The flagship annual gala of PP Savani University — an unforgettable evening of fine dining, live music, awards, and networking. Join 200 fellow students for a night of celebration, recognition, and connection as we close the academic year in style.',
  'An unforgettable evening of fine dining, live music, awards, and networking.',
  'Grand Auditorium, PP Savani University',
  'PP Savani University Campus, Surat, Gujarat',
  '2026-12-19',
  '18:00',
  '22:30',
  200,
  0,
  499.00,
  'ppsu-events@upi',
  'https://images.pexels.com/photos/14646741/pexels-photo-14646741.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop',
  24,
  'active',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  venue = EXCLUDED.venue,
  address = EXCLUDED.address,
  event_date = EXCLUDED.event_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  capacity = EXCLUDED.capacity,
  ticket_price = EXCLUDED.ticket_price,
  upi_id = EXCLUDED.upi_id,
  banner_url = EXCLUDED.banner_url,
  reservation_expiry_hours = EXCLUDED.reservation_expiry_hours,
  status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured,
  updated_at = now();
