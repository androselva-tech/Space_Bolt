/* eslint-disable @typescript-eslint/no-require-imports */
// Every sprite in the game. The rocket, its parts, the shield, the checkpoint ring and the part
// icons are drawn by tools/make-art.mjs; the deep space (nebula, asteroids, space junk, planet
// edges, the flare, rings and canisters) by tools/make-space.mjs; the planets and the UI coins,
// stars and hearts come from LearnBolt's art generator.
export const TEXTURES = {
  earth: require('../assets/game/planet_earth.png'),
  moon: require('../assets/game/planet_moon.png'),
  shield: require('../assets/game/shield.png'),
  flame: require('../assets/game/flame.png'),
  gate: require('../assets/game/gate.png'),
  boom: require('../assets/game/boom.png'),
  coin: require('../assets/game/coin.png'),
  smoke: require('../assets/game/smoke.png'),
  glow: require('../assets/game/glow.png'),
  cloud: require('../assets/game/cloud.png'),
  astronaut: require('../assets/game/astronaut.png'),
  astronautWalk: require('../assets/game/astronaut_walk.png'),
  // the deep-space flights (tools/make-space.mjs)
  rock1: require('../assets/game/rock_1.png'),
  rock2: require('../assets/game/rock_2.png'),
  rock3: require('../assets/game/rock_3.png'),
  rock4: require('../assets/game/rock_4.png'),
  rock5: require('../assets/game/rock_5.png'),
  rock6: require('../assets/game/rock_6.png'),
  junkSatellite: require('../assets/game/junk_satellite.png'),
  junkPanel: require('../assets/game/junk_panel.png'),
  fuelCanister: require('../assets/game/fuel_canister.png'),
  navRing: require('../assets/game/nav_ring.png'),
  sunFlare: require('../assets/game/sun_flare.png'),
  spaceNebula: require('../assets/game/space_nebula.jpg'),
  limbEarth: require('../assets/game/limb_earth.png'),
  limbMoon: require('../assets/game/limb_moon.png'),
  moonGround: require('../assets/game/moon_ground.jpg'),
} as const;

export type TextureKey = keyof typeof TEXTURES;

/** The asteroid pictures: each rock in a flight picks one by its id. */
export const ROCK_TEXTURES = ['rock1', 'rock2', 'rock3', 'rock4', 'rock5', 'rock6'] as const satisfies readonly TextureKey[];
/** Each hazard's picture (rocks vary; comets are rocks falling; junk is a dead satellite or a torn solar panel). */
export function hazardTexture(type: string, id: number): TextureKey {
  if (type === 'debris') return 'junkSatellite';
  if (type === 'panel') return 'junkPanel';
  return ROCK_TEXTURES[id % ROCK_TEXTURES.length];
}

export const UI = {
  coin: require('../assets/game/coin.png'),
  star: require('../assets/game/star.png'),
  starEmpty: require('../assets/game/star_empty.png'),
  heart: require('../assets/game/heart.png'),
  heartEmpty: require('../assets/game/heart_empty.png'),
  paper: require('../assets/game/paper.jpg'),
  engine: require('../assets/game/part_engine.png'),
  tank: require('../assets/game/part_tank.png'),
  shield: require('../assets/game/part_shield.png'),
  life: require('../assets/game/part_life.png'),
  earth: require('../assets/game/planet_earth.png'),
  moon: require('../assets/game/planet_moon.png'),
  sky: require('../assets/game/space_nebula.jpg'),
  rock: require('../assets/game/rock_3.png'),
  bigRock: require('../assets/game/rock_2.png'),
  junkSatellite: require('../assets/game/junk_satellite.png'),
  junkPanel: require('../assets/game/junk_panel.png'),
} as const;

