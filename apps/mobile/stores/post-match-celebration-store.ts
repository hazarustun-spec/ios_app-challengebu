import { create } from 'zustand';
import type { Level } from '@tennis/shared';

export interface AwardedBadgeView {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
}

export type CelebrationItem =
  | { kind: 'badge'; badge: AwardedBadgeView }
  | { kind: 'level'; before: Level; after: Level };

interface State {
  queue: CelebrationItem[];
  enqueue: (items: CelebrationItem[]) => void;
  popFront: () => void;
  clear: () => void;
}

export const useCelebrationStore = create<State>((set) => ({
  queue: [],
  enqueue: (items) => set((s) => ({ queue: [...s.queue, ...items] })),
  popFront: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));
