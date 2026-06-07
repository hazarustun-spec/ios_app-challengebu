import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { ScreenContainer } from '../ui/ScreenContainer';
import { ProgressBar } from './ProgressBar';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLabel?: string;
}

export function StepLayout({
  step, total, title, subtitle, children, onNext, nextDisabled, nextLoading, nextLabel = 'Devam',
}: Props) {
  return (
    <ScreenContainer scrollable>
      <ProgressBar current={step} total={total} />
      <View className="mt-4 flex-1">
        <Text className="text-2xl font-bold text-gray-900">{title}</Text>
        {subtitle && <Text className="mt-1 text-base text-gray-600">{subtitle}</Text>}
        <View className="mt-6 flex-1">{children}</View>
        <View className="mt-6">
          <Button onPress={onNext} disabled={nextDisabled} loading={nextLoading}>
            {nextLabel}
          </Button>
        </View>
      </View>
    </ScreenContainer>
  );
}
