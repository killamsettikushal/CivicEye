import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';

/**
 * Subscribes to Supabase Realtime changes on a table and calls `onChange`
 * whenever a row is inserted, updated, or deleted. The callback receives
 * the event type so the caller can decide whether to refetch or patch
 * local state.
 *
 * @param table   - The table name to watch (e.g. 'reports', 'notifications')
 * @param onChange - Called with the PostgresChangeEvent when a row changes
 * @param filter  - Optional filter string (e.g. 'user_id=eq.<uuid>')
 */
export function useRealtimeTable(
  table: string,
  onChange: (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void,
  filter?: string,
) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    const channelName = `realtime-${table}-${filter ?? 'all'}`;

    let channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: any) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          callbackRef.current(eventType, payload.new ?? payload.old ?? null);
        },
      );

    channel = channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[useRealtimeTable] Subscribed to ${table} (${filter ?? 'all'})`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(`[useRealtimeTable] Channel error on ${table}`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
