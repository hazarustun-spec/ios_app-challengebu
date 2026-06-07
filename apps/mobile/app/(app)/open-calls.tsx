import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { EmptyState } from '../../components/matches/EmptyState';

export default function OpenCallsScreen() {
  return (
    <ScreenContainer>
      <EmptyState
        title="Açık ilan akışı"
        message="Yakında — Task 15'te eklenecek."
        icon="📢"
      />
    </ScreenContainer>
  );
}
