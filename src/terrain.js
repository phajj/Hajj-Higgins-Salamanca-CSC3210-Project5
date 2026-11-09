import * as THREE from "three";

/**
 * Terrain Generation
 * @author Laura Salamanca
 */

// Perlin noise
class Perlin {
  // Creates a new permutation table for each Perlin noise instance
  constructor() {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      // Fisher-Yates shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  // Fade function for smooth interpolation
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Gradient to calculate the dot product with the offset vector
  grad(h, x, y) {
    switch (h & 3) {
      case 0:
        return x + y;
      case 1:
        return -x + y;
      case 2:
        return x - y;
      default:
        return -x - y;
    }
  }
  // Calculates Perlin noise at the given coordinates
  noise(x, y) {
    // returns roughly [-1, 1]
    const X = Math.floor(x) & 255,
      Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x),
      v = this.fade(y);
    const P = this.perm;
    const aa = P[P[X] + Y],
      ab = P[P[X] + Y + 1];
    const ba = P[P[X + 1] + Y],
      bb = P[P[X + 1] + Y + 1];
    const l1 = this.grad(aa, x, y) * (1 - u) + this.grad(ba, x - 1, y) * u;
    const l2 =
      this.grad(ab, x, y - 1) * (1 - u) + this.grad(bb, x - 1, y - 1) * u;
    return l1 * (1 - v) + l2 * v;
  }

  // Fractal Brownian motion: layer octaves of noise
  fbm(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
    let amp = 1,
      freq = 1,
      sum = 0,
      norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
}

// Terrain Creation
export class Terrain {
  /**
   * @param size       world-space width/depth of the terrain
   * @param segments   grid cells per side (vertices = segments + 1)
   * @param amplitude  max height in world units
   * @param scale      noise frequency; smaller = broader, smoother hills
   */
  constructor({
    size = 400,
    segments = 200,
    amplitude = 12,
    scale = 0.012,
  } = {}) {
    this.size = size;
    this.segments = segments;
    this.step = size / segments;
    this.half = size / 2;
    this.amplitude = amplitude;
    this.perlin = new Perlin();

    const n = segments + 1;
    this.heights = new Float32Array(n * n);

    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2); // lay flat

    // Fill the heightmap
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = j * this.step - this.half;
        const z = i * this.step - this.half;
        // Base rolling hills (low octave count keeps it smooth)
        let h = this.perlin.fbm(x * scale, z * scale, 5);
        // Adds gentle high-frequency bumpiness so walking feels "bumpy"
        h += 0.05 * this.perlin.noise(x * 0.15, z * 0.15);
        this.heights[i * n + j] = h * amplitude;
      }
    }

    this._syncGeometry();

    this.material = new THREE.MeshStandardMaterial({
      color: 0x4a7c3a,
      roughness: 1,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = false; // spec: terrain does NOT cast shadows
    this.mesh.receiveShadow = true; // but trees' shadows land on it
  }

  // Copy heights into the vertex buffer and recompute lighting normals
  _syncGeometry() {
    const pos = this.geometry.attributes.position;
    for (let k = 0; k < this.heights.length; k++) pos.setY(k, this.heights[k]);
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }

  // Ground height at any world (x, z) via bilinear interpolation
  // Use for the camera, tree placement, and collision
  heightAt(x, z) {
    const n = this.segments + 1;
    const gx = (x + this.half) / this.step;
    const gz = (z + this.half) / this.step;
    if (gx < 0 || gz < 0 || gx > this.segments || gz > this.segments) return 0;
    const j = Math.min(Math.floor(gx), this.segments - 1);
    const i = Math.min(Math.floor(gz), this.segments - 1);
    const fx = gx - j,
      fz = gz - i;
    const h00 = this.heights[i * n + j],
      h10 = this.heights[i * n + j + 1];
    const h01 = this.heights[(i + 1) * n + j],
      h11 = this.heights[(i + 1) * n + j + 1];
    return (
      (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz
    );
  }
}
