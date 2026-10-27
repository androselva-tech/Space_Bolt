import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { PartId } from '../rocket/model';

/** Where the player is pushing (joystick or keys): a direction, length 0..1, y up. */
export const walkInput = { x: 0, y: 0, keys: { x: 0, y: 0 } };

/** An arrow at the edge of the view towards a part that's off screen (stage-area pixels, angle in radians). */
export type Marker = { part: PartId; x: number; y: number; angle: number; dist: number };
/** The astronaut's position, the nearest part still to find and the edge arrows, a few times a second, for the overlay. */
export type WalkReadout = { x: number; y: number; nearest: { part: PartId; dist: number } | null; markers: Marker[] };
export const walkStore = createStore<WalkReadout>()(() => ({ x: 0, y: 0, nearest: null, markers: [] }));
export const useWalk = <T,>(sel: (w: WalkReadout) => T) => useStore(walkStore, sel);
