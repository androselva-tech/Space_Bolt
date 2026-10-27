import { useMemo } from 'react';
import * as THREE from 'three';
import { textureSource, useLoader } from './r3f';

/** Loads every sprite of a texture map once (suspends until ready). */
export function useTextures<K extends string>(map: Record<K, number | string>): Record<K, THREE.Texture> {
  const keys = useMemo(() => Object.keys(map) as K[], [map]);
  const sources = useMemo(() => keys.map((k) => textureSource(map[k])), [keys, map]);
  const list = useLoader(THREE.TextureLoader, sources) as THREE.Texture[];
  return useMemo(() => {
    const out = {} as Record<K, THREE.Texture>;
    keys.forEach((k, i) => {
      const t = list[i];
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      out[k] = t;
    });
    return out;
  }, [keys, list]);
}

