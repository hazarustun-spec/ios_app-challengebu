export const queryKeys = {
  matchRequests: {
    all: ['match-requests'] as const,
    incoming: () => [...queryKeys.matchRequests.all, 'incoming'] as const,
    outgoing: () => [...queryKeys.matchRequests.all, 'outgoing'] as const,
    detail: (id: string) => [...queryKeys.matchRequests.all, 'detail', id] as const,
  },
  openCalls: {
    all: ['open-calls'] as const,
    feed: () => [...queryKeys.openCalls.all, 'feed'] as const,
    detail: (id: string) => [...queryKeys.openCalls.all, 'detail', id] as const,
  },
  applications: {
    all: ['applications'] as const,
    forRequest: (requestId: string) => [...queryKeys.applications.all, 'request', requestId] as const,
    mine: () => [...queryKeys.applications.all, 'mine'] as const,
  },
  activeMatches: {
    all: ['active-matches'] as const,
    list: () => [...queryKeys.activeMatches.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.activeMatches.all, 'detail', id] as const,
  },
  matchHistory: {
    all: ['match-history'] as const,
    mine: () => [...queryKeys.matchHistory.all, 'mine'] as const,
  },
  players: {
    all: ['players'] as const,
    list: (filters?: { gender?: string }) => [...queryKeys.players.all, 'list', filters] as const,
  },
  courts: ['courts'] as const,
  departments: ['departments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
} as const;
