import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

/** What the movie says on screen right now (the scenes set it; the overlay shows it). */
type Movie = { caption: string; sub: string; at: number; flash: number };
export const movieStore = createStore<Movie>()(() => ({ caption: '', sub: '', at: 0, flash: 0 }));
export const useMovie = <T,>(sel: (m: Movie) => T) => useStore(movieStore, sel);
export function caption(text: string, sub = '') {
  const m = movieStore.getState();
  if (m.caption !== text || m.sub !== sub) movieStore.setState({ caption: text, sub, at: Date.now() });
}
/** A white flash (0..1) over the screen, for cuts. */
export const flash = (v: number) => { if (Math.abs(movieStore.getState().flash - v) > 0.01) movieStore.setState({ flash: v }); };

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
