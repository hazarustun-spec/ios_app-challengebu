// ToastProvider — Plan 8 Phase C7.
//
// Imperative toast orchestration mounted at the root of the app. Exposes
// `useToast()` with a single `show(message, variant?)` method so any screen
// can fire confirmations without prop-drilling.
//
// Behavior:
//   - One toast at a time. Calling `show` while a toast is on screen
//     replaces it (newer message wins) — the timer + animation re-key on
//     each call via `key: Date.now()`.
//   - Slide-up entry (translateY 80 → 0 + opacity 0 → 1) over 220ms with
//     the design-bundle's gentle ease-out curve.
//   - Auto-dismiss after 2500ms, then slide back down and clear.
//   - `pointerEvents="none"` on the overlay so the toast never blocks
//     touches on the screen below it.
//
// Design bundle reference: there's no formal Provider in the bundle —
// `nav.toast(...)` is the imperative API used across screens (see
// `screens-match-flow.jsx`, `screens-system.jsx`, etc.). We rebuild that
// surface in React Native via a Context + `Animated` so the API stays
// `toast.show('Teklif gönderildi')` from any screen.

import { useEffect, useState, useCallback, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import { ToastView, type ToastVariant } from './Toast';

interface ToastApi {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

interface ToastState {
  message: string;
  variant: ToastVariant;
  key: number;
}

const ENTRY_DURATION = 220;
const EXIT_DURATION = 200;
const VISIBLE_DURATION = 2500;
const ENTRY_TRANSLATE = 80;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  // Lazy-init the Animated values once per provider mount so we don't
  // recreate them every render.
  const [translateY] = useState(() => new Animated.Value(ENTRY_TRANSLATE));
  const [opacity] = useState(() => new Animated.Value(0));

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      setToast({ message, variant, key: Date.now() });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    // Reset to entry position for the new toast — covers the
    // back-to-back show() case where animation hasn't finished returning
    // to the offscreen state.
    translateY.setValue(ENTRY_TRANSLATE);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ENTRY_DURATION,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTRY_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: ENTRY_TRANSLATE,
          duration: EXIT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    }, VISIBLE_DURATION);

    return () => clearTimeout(timeout);
  }, [toast, translateY, opacity]);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 32,
            transform: [{ translateY }],
            opacity,
          }}
        >
          <ToastView variant={toast.variant} message={toast.message} />
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}
