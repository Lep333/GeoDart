import { useCallback, useEffect, useState } from 'react';
import type { InitResponse, IncrementResponse, DecrementResponse, PositionResponse } from '../../shared/types/api';

interface CounterState {
  count: number;
  username: string | null;
  loading: boolean;
  gallery: string;
  latitude: number;
  longitude: number;
}

export const useCounter = () => {
  const [state, setState] = useState<CounterState>({
    count: 0,
    username: null,
    loading: true,
    gallery: '',
    latitude: 0,
    longitude: 0
  });
  const [postId, setPostId] = useState<string | null>(null);

  // fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();
        if (data.type !== 'init') throw new Error('Unexpected response');
        setState({ 
          count: data.count,
          username: data.username,
          loading: false,
          gallery: data.gallery,
          latitude: 0,
          longitude: 0
        });
        setPostId(data.postId);
      } catch (err) {
        console.error('Failed to init counter', err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };
    void init();
  }, []);

  const update = useCallback(
    async (action: 'increment' | 'decrement') => {
      if (!postId) {
        console.error('No postId – cannot update counter');
        return;
      }
      try {
        const res = await fetch(`/api/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: IncrementResponse | DecrementResponse = await res.json();
        setState((prev) => ({ ...prev, count: data.count }));
      } catch (err) {
        console.error(`Failed to ${action}`, err);
      }
    },
    [postId]
  );

  const getOGLocation = useCallback(
    async () => {
      const response = await fetch('/api/submit_dart_position');
      const data: PositionResponse = await response.json();
      state.latitude = data.latitude;
      state.longitude = data.longitude;
    },
    [postId]
  )

  return {
    ...state,
    getOGLocation,
  } as const;
};
