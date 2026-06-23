// Global render-error boundary — Plan 8 Phase H5.
//
// Catches any uncaught render error in the tree and shows a friendly,
// self-contained fallback (no hooks / no NavHeader, so it works even if the
// theme or navigation context is the thing that failed) with a retry that
// re-mounts the subtree. Prevents a white-screen crash during App Review.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 14,
        }}
      >
        <Text
          style={{
            fontSize: 21,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
          }}
        >
          Bir şeyler ters gitti
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 21,
            color: colors.text2,
            textAlign: 'center',
          }}
        >
          Beklenmedik bir hata oluştu. Tekrar denemek için aşağıdaki düğmeye
          dokun; sorun sürerse uygulamayı kapatıp yeniden aç.
        </Text>
        <Pressable
          onPress={this.reset}
          style={{
            marginTop: 6,
            height: 50,
            paddingHorizontal: 28,
            borderRadius: 9999,
            backgroundColor: colors.lime,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.onLime }}>
            Tekrar dene
          </Text>
        </Pressable>
      </View>
    );
  }
}
