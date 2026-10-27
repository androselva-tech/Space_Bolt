import * as THREE from 'three';

/**
 * A pen stroke: a flat ribbon along a polyline, rebuilt in place every frame
 * (WebGL can't draw thick lines, so strokes are thin triangle strips).
 */
export type InkLine = {
  geometry: THREE.BufferGeometry;
  /** Points as [x0, y0, x1, y1, ...]; fewer than the capacity is fine. */
  set(points: ArrayLike<number>, count: number, width: number, offset?: number): void;
};

export function createInkLine(capacity: number): InkLine {
  const geometry = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(capacity * 2 * 3), 3);
  geometry.setAttribute('position', pos);
  const index: number[] = [];
  for (let i = 0; i < capacity - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(index);

  return {
    geometry,
    set(pts, count, width, offset = 0) {
      const n = Math.min(count, capacity);
      for (let i = 0; i < n; i++) {
        const j = Math.min(n - 1, i + 1), k = Math.max(0, i - 1);
        const dx = pts[j * 2] - pts[k * 2], dy = pts[j * 2 + 1] - pts[k * 2 + 1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const x = pts[i * 2] + nx * offset, y = pts[i * 2 + 1] + ny * offset;
        pos.setXYZ(i * 2, x + (nx * width) / 2, y + (ny * width) / 2, 0);
        pos.setXYZ(i * 2 + 1, x - (nx * width) / 2, y - (ny * width) / 2, 0);
      }
      geometry.setDrawRange(0, Math.max(0, n - 1) * 6);
      pos.needsUpdate = true;
      geometry.computeBoundingSphere();
    },
  };
}

/** Points around a circle, closed (first point repeated), for heads, knobs and wheels. */
export function circlePoints(out: Float32Array, cx: number, cy: number, r: number, n: number): number {
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out[i * 2] = cx + Math.cos(a) * r;
    out[i * 2 + 1] = cy + Math.sin(a) * r;
  }
  return n + 1;
}
