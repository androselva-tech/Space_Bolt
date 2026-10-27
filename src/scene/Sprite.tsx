import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';

export type SpriteProps = {
  texture: THREE.Texture;
  width: number;
  height: number;
  /** Image-space point (0..1 from top-left) placed at `position`. */
  anchor?: readonly [number, number];
  position?: [number, number, number];
  opacity?: number;
  flipX?: boolean;
  visible?: boolean;
};

/** A flat textured quad — every character and prop in the game is one of these. */
export const Sprite = forwardRef<THREE.Mesh, SpriteProps>(function Sprite(
  { texture, width, height, anchor = [0.5, 0.5], position = [0, 0, 0], opacity = 1, flipX, visible = true },
  ref
) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height);
    g.translate((0.5 - anchor[0]) * width, (anchor[1] - 0.5) * height, 0);
    return g;
  }, [width, height, anchor[0], anchor[1]]);

  return (
    <mesh ref={ref} geometry={geometry} position={position} scale={[flipX ? -1 : 1, 1, 1]} visible={visible}>
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
});
