import { Platform } from 'react-native';

export const INK = '#2f2b27';
export const PAPER = '#efe6d2';
/** The dusk scene's darkest tone: behind the whole app (screen edges, loading, map). */
export const NIGHT = '#0e0a09';
export const CARD = '#f6efdf';
export const MUTED = '#8a8175';
export const GOLD = '#c9982a';
export const RED = '#b5473a';
export const GREEN = '#4f7d4a';
export const FONT = Platform.OS === 'web' ? "'Patrick Hand', PatrickHand_400Regular, 'Comic Sans MS', cursive" : 'PatrickHand_400Regular';

export const text = (size: number, extra: object = {}) => ({
  fontFamily: FONT,
  fontSize: size,
  color: INK,
  letterSpacing: size * 0.02,
  ...extra,
});

/** Light text over the dark dusk scene. */
export const LIGHT = '#fff4e6';
export const LIGHT_MUTED = 'rgba(255,244,230,0.72)';
export const LIGHT_GOLD = '#ffd45c';
/** Text drawn over the dusk scene: light, with a soft shadow for contrast. */
export const lit = (size: number, extra: object = {}) =>
  text(size, { color: LIGHT, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, ...extra });
