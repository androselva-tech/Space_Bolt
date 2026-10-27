import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

/**
 * The capsule's ride home, as the scene reports it a few times a second for the parachute buttons:
 * altitude (metres) and speed (km/h), and each chute's window: not yet ('wait'), now ('open'), or
 * over ('done': fired, or the backup fired it).
 */
export type ChuteWindow = 'wait' | 'open' | 'done';
export type Reentry = { altitude: number; speed: number; drogue: ChuteWindow; mains: ChuteWindow };
export const reentryStore = createStore<Reentry>()(() => ({ altitude: 0, speed: 0, drogue: 'wait', mains: 'wait' }));
export const useReentry = <T,>(sel: (r: Reentry) => T) => useStore(reentryStore, sel);

/** The chute windows (scene altitude units; the sea is at 0). */
export const DROGUE_WINDOW = [4200, 2600] as const;
export const MAINS_WINDOW = [2400, 1000] as const;
/** Scene units to metres, for the readout. */
export const ALT_TO_M = 1.7;
