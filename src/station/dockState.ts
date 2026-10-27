import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

/**
 * What the docking controls are doing right now (buttons held, or keys), each -1, 0 or 1:
 * spin (roll the shuttle), thrust (forward / brake), and the side thrusters (move left-right, up-down).
 */
export const dockInput = { spin: 0 as -1 | 0 | 1, thrust: 0 as -1 | 0 | 1, mx: 0 as -1 | 0 | 1, my: 0 as -1 | 0 | 1 };

/** The docking readouts, updated a few times a second by the scene for the panel. */
export type DockReadout = {
  /** Metres to the port, closing speed (m/s; negative is backing away). */
  range: number;
  speed: number;
  /** Our spin minus the station's (deg/s), how far the slot is turned from our collar (degrees), how far off centre (m). */
  spinDiff: number;
  align: number;
  offset: number;
  okSpin: boolean;
  okAlign: boolean;
  okSpeed: boolean;
  okOffset: boolean;
  /** Where the docking port is on screen, as a fraction of the stage area (for the target marker). */
  portX: number;
  portY: number;
};
export const dockStore = createStore<DockReadout>()(() => ({
  range: 300, speed: 0, spinDiff: 0, align: 0, offset: 0, okSpin: false, okAlign: false, okSpeed: true, okOffset: false, portX: 0.5, portY: 0.5,
}));
export const useDock = <T,>(sel: (d: DockReadout) => T) => useStore(dockStore, sel);
