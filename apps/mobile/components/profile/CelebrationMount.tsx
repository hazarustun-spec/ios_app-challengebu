import { useCelebrationStore } from '../../stores/post-match-celebration-store';
import { BadgeUnlockModal } from './BadgeUnlockModal';
import { LevelUpModal } from './LevelUpModal';

export function CelebrationMount() {
  const front = useCelebrationStore((s) => s.queue[0]);
  const popFront = useCelebrationStore((s) => s.popFront);

  if (!front) return null;

  if (front.kind === 'badge') {
    return (
      <BadgeUnlockModal
        visible
        badge={front.badge}
        onClose={popFront}
      />
    );
  }
  return (
    <LevelUpModal
      visible
      before={front.before}
      after={front.after}
      onClose={popFront}
    />
  );
}
