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
  matchApplications: {
    all: ['match-applications'] as const,
    byRequest: (id: string) =>
      [...queryKeys.matchApplications.all, 'request', id] as const,
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
  ladder: {
    all: ['ladder'] as const,
    byCategory: (category: string) => [...queryKeys.ladder.all, category] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
  },
  admin: {
    all: ['admin'] as const,
    pendingDisputes: () => [...queryKeys.admin.all, 'pending-disputes'] as const,
    disputeDetail: (id: string) => [...queryKeys.admin.all, 'dispute', id] as const,
    seasons: () => [...queryKeys.admin.all, 'seasons'] as const,
    tournaments: (seasonId: string) => [...queryKeys.admin.all, 'tournaments', seasonId] as const,
    users: (search: string | null) => [...queryKeys.admin.all, 'users', search] as const,
    userDetail: (userId: string) => [...queryKeys.admin.all, 'user', userId] as const,
    health: () => [...queryKeys.admin.all, 'health'] as const,
    auditLog: () => [...queryKeys.admin.all, 'audit-log'] as const,
    cronStatus: () => [...queryKeys.admin.all, 'cron-status'] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    published: () => [...queryKeys.announcements.all, 'published'] as const,
  },
  seasons: {
    all: ['seasons'] as const,
    current: () => [...queryKeys.seasons.all, 'current'] as const,
    boundaries: () => [...queryKeys.seasons.all, 'boundaries'] as const,
    finaleStatus: () => [...queryKeys.seasons.all, 'finale-status'] as const,
  },
  tournaments: {
    all: ['tournaments'] as const,
    bracket: (tournamentId: string) =>
      [...queryKeys.tournaments.all, 'bracket', tournamentId] as const,
    bySeason: (seasonId: string) =>
      [...queryKeys.tournaments.all, 'by-season', seasonId] as const,
  },
  yearly: {
    all: ['yearly'] as const,
    standings: (year: number) => [...queryKeys.yearly.all, 'standings', year] as const,
    pastChampion: (userId: string) =>
      [...queryKeys.yearly.all, 'past-champion', userId] as const,
  },
  suggestions: {
    all: ['suggestions'] as const,
    byCategory: (category: string) => ['suggestions', category] as const,
  },
  courts: ['courts'] as const,
  departments: ['departments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
} as const;
