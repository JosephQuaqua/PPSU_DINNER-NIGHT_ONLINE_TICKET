import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { EventRow } from '@/types/database';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });
}

export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ['event', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<EventRow | null> => {
      const { data, error } = await supabase.from('events').select('*').eq('slug', slug as string).maybeSingle();
      if (error) throw error;
      return data as EventRow | null;
    },
  });
}
