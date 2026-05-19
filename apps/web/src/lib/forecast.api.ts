import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ForecastSessionDto, LeaderboardDto, VoteHistoryDto } from '@gpls/shared';
import { apiClient } from './api-client';

export function useActiveSession(token: string | null) {
  return useQuery({
    queryKey: ['forecast', 'session', !!token],
    queryFn: async () => {
      const res = await apiClient.get<ForecastSessionDto>('/forecast/session');
      return res.data ?? null;
    },
    refetchInterval: 60_000,
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, direction }: { sessionId: string; direction: 'up' | 'down' | 'flat'; token?: string }) => {
      const res = await apiClient.post('/forecast/vote', { sessionId, direction });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecast'] }),
  });
}

export function useLeaderboard(month: string) {
  return useQuery<LeaderboardDto>({
    queryKey: ['forecast', 'leaderboard', month],
    queryFn: async () => {
      const res = await apiClient.get<LeaderboardDto>(`/forecast/leaderboard?month=${month}`);
      return res.data;
    },
  });
}

export function useVoteHistory(token: string | null, page = 1) {
  return useQuery<VoteHistoryDto>({
    queryKey: ['forecast', 'history', page],
    queryFn: async () => {
      const res = await apiClient.get<VoteHistoryDto>(`/forecast/history?page=${page}`);
      return res.data;
    },
    enabled: !!token,
  });
}
