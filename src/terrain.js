import * as THREE from "three";

/**
 * Terrain Generation
 * Assisted by Claude Code
 * @author Laura Salamanca
 */

// Perlin noise creation
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

  // Calculates Perlin noise at the given (x,y) coordinates
  noise(x, y) {
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

    // Per-vertex color buffer, filled in by _updateColors()
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(n * n * 3), 3),
    );

    this._syncGeometry();

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true, // grass/dirt coloring from _updateColors()
      map: this._makeGrainTexture(), // fine speckle that multiplies with the vertex colors
      roughness: 1,
    });

    // Highlight under the crosshair
    this.highlight = {
      position: { value: new THREE.Vector3() },
      radius: { value: 1.0 },
      intensity: { value: 0 },
      color: { value: new THREE.Color(0xffe9a0) },
    };

    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uHighlightPos = this.highlight.position;
      shader.uniforms.uHighlightRadius = this.highlight.radius;
      shader.uniforms.uHighlightIntensity = this.highlight.intensity;
      shader.uniforms.uHighlightColor = this.highlight.color;

      // Vertex shader: pass each fragment's world-space position along
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vTerrainWorldPos;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvTerrainWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;",
        );

      // Fragment shader: glow that fades smoothly with distance from the hit point
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vTerrainWorldPos;
          uniform vec3  uHighlightPos;
          uniform float uHighlightRadius;
          uniform float uHighlightIntensity;
          uniform vec3  uHighlightColor;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float hlDist = distance(vTerrainWorldPos, uHighlightPos);
          float hl = (1.0 - smoothstep(uHighlightRadius * 0.55, uHighlightRadius, hlDist))
                     * uHighlightIntensity;
          totalEmissiveRadiance += uHighlightColor * hl * 0.45;`,
        );
    };

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
    this._updateColors();
  }

  // Add texture to terrain
  _updateColors() {
    const n = this.segments + 1;
    const normals = this.geometry.attributes.normal;
    const colors = this.geometry.attributes.color;

    const grassLight = new THREE.Color(0x5f9141);
    const grassDark = new THREE.Color(0x3b6b2a);
    const dirtLight = new THREE.Color(0x8a6a45);
    const dirtDark = new THREE.Color(0x5e4630);
    const grass = new THREE.Color(),
      dirt = new THREE.Color(),
      out = new THREE.Color();
    const smooth = (a, b, x) => {
      const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
      return t * t * (3 - 2 * t);
    };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const k = i * n + j;
        const x = j * this.step - this.half;
        const z = i * this.step - this.half;

        // Large soft patches of lighter/darker grass, plus a separate patchy dirt mask
        const grassNoise =
          this.perlin.fbm(x * 0.03 + 100, z * 0.03 + 100, 3) * 0.5 + 0.5;
        const dirtNoise =
          this.perlin.fbm(x * 0.02 - 50, z * 0.02 - 50, 3) * 0.5 + 0.5;

        const slope = 1 - normals.getY(k); // 0 = flat, larger = steeper

        // Dirt shows up on steep spots and in noise patches
        let dirtAmount =
          smooth(0.05, 0.25, slope) + smooth(0.62, 0.78, dirtNoise) * 0.8;
        dirtAmount = Math.min(dirtAmount, 1);

        grass.lerpColors(grassDark, grassLight, grassNoise);
        dirt.lerpColors(dirtDark, dirtLight, grassNoise);
        out.lerpColors(grass, dirt, dirtAmount);
        colors.setXYZ(k, out.r, out.g, out.b);
      }
    }
    colors.needsUpdate = true;
  }

  // Small tiling noise texture drawn on a canvas
  _makeGrainTexture() {
    const s = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = s;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(s, s);
    for (let p = 0; p < s * s; p++) {
      const v = 170 + Math.random() * 85;
      img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v;
      img.data[p * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(this.size / 4, this.size / 4); // one tile every ~4 world units
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  // Show the highlight centered on a point
  setHighlight(point) {
    this.highlight.position.value.copy(point);
    this.highlight.intensity.value = 1;
  }

  // Hide the highlight
  clearHighlight() {
    this.highlight.intensity.value = 0;
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
