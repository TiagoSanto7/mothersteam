import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { useAppStore } from '../store/useAppStore';

const CSS_VAR = '--keyboard-height';

// Abaixo disso a mudança de viewport é chrome do browser (barra de URL), não teclado.
const MIN_KEYBOARD_PX = 120;

function publish(px: number) {
  document.documentElement.style.setProperty(CSS_VAR, `${px}px`);
  useAppStore.getState().setKeyboardOpen(px > 0);
}

/**
 * Fonte única da altura do teclado. O Capacitor está com `resize: 'none'` (iOS) e o
 * Android 15+ não redimensiona mais a janela, então nada encolhe a viewport sozinho —
 * quem faz isso é o CSS, consumindo a var publicada aqui.
 */
export function useKeyboardInset() {
  useEffect(() => {
    publish(0);

    if (Capacitor.isNativePlatform()) {
      const show = Keyboard.addListener('keyboardWillShow', (info) => publish(info.keyboardHeight));
      const hide = Keyboard.addListener('keyboardWillHide', () => publish(0));
      return () => {
        void show.then((h) => h.remove());
        void hide.then((h) => h.remove());
        publish(0);
      };
    }

    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      publish(overlap >= MIN_KEYBOARD_PX ? Math.round(overlap) : 0);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      publish(0);
    };
  }, []);
}
