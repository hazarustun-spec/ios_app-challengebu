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
    forUser: (userId: string) => [...queryKeys.matchHistory.all, 'user', userId] as const,
  },
  badges: {
    all: ['badges'] as const,
    catalog: () => [...queryKeys.badges.all, 'catalog'] as const,
    mine: () => [...queryKeys.badges.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.badges.all, 'user', userId] as const,
  },
  rankings: {
    all: ['rankings'] as const,
    mine: () => [...queryKeys.rankings.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.rankings.all, 'user', userId] as const,
  },
  stats: {
    all: ['stats'] as const,
    mine: () => [...queryKeys.stats.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.stats.all, 'user', userId] as const,
  },
  eloHistory: {
    all: ['elo-history'] as const,
    mine: () => [...queryKeys.eloHistory.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.eloHistory.all, 'user', userId] as const,
  },
  headToHead: {
    all: ['head-to-head'] as const,
    between: (otherUserId: string) => [...queryKeys.headToHead.all, 'pair', otherUserId] as const,
  },
  players: {
    all: ['players'] as const,
    list: (filters?: { gender?: string }) => [...queryKeys.players.all, 'list', filters] as const,
    detail: (userId: string) => [...queryKeys.players.all, 'detail', userId] as const,
  },
  courts: ['courts'] as const,
  departments: ['departments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
} as const;
