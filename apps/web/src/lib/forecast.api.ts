import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ForecastSessionDto, LeaderboardDto, VoteHistoryDto } from '@gpls/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchSession(token: string | null): Promise<ForecastSessionDto | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}/forecast/session`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export function useActiveSession(token: string | null) {
  return useQuery({
    queryKey: ['forecast', 'session', !!token],
    queryFn: () => fetchSession(token),
    refetchInterval: 60_000,
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, direction, token }: { sessionId: string; direction: 'up' | 'down' | 'flat'; token: string }) => {
      const res = await fetch(`${API}/forecast/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, direction }),
      });
      if (!res.ok) throw new Error('Vote failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecast'] }),
  });
}

export function useLeaderboard(month: string) {
  return useQuery<LeaderboardDto>({
    queryKey: ['forecast', 'leaderboard', month],
    queryFn: async () => {
      const res = await fetch(`${API}/forecast/leaderboard?month=${month}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
}

export function useVoteHistory(token: string | null, page = 1) {
  return useQuery<VoteHistoryDto>({
    queryKey: ['forecast', 'history', page],
    queryFn: async () => {
      const res = await fetch(`${API}/forecast/history?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!token,
  });
}
