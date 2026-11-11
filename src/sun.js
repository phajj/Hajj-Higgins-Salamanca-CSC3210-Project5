import * as THREE from "three";

/**
 * The sun: a glowing sphere with a directional light, circling the terrain about the x axis.
 * Both sit on a pivot at the terrain's center, so turning the pivot moves them together.
 *
 * @author Jackson Higgins
 */

export const ORBIT_RADIUS = 150; // Distance from the terrain's center (kept inside the camera's far plane of 200)
const SUN_SIZE = 8;
const SUN_COLOR = 0xfff2a0; 
const HORIZON_COLOR = new THREE.Color(0xff4a1a); // Red-orange, when the sun is at the horizon
const OVERHEAD_COLOR = new THREE.Color(SUN_COLOR);
const LIGHT_INTENSITY = 2;
const ROTATION_SPEED = THREE.MathUtils.degToRad(15) / 10; // 15 degrees every 10 seconds, in radians per second
const SHADOW_EXTENT = 210; // Half the width the shadows cover, a bit more than half the 400-wide terrain
const SHADOW_MAP_SIZE = 4096; // Shadow texture resolution (higher = sharper shadows over the big area)
const START_ANGLE = THREE.MathUtils.degToRad(30); // Starts 30 degrees above the horizon, in front of the spawn

export class Sun {
  constructor() {
    // Turning the pivot about x swings the sun through the y-z plane: up from the -z horizon, overhead, down to +z
    this.pivot = new THREE.Group();
    this.pivot.rotation.x = START_ANGLE;

    // Basic material so the sun is always fully bright, whatever the lighting
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_SIZE, 32, 16),
      new THREE.MeshBasicMaterial({ color: SUN_COLOR })
    );
    this.mesh.position.set(0, 0, -ORBIT_RADIUS);
    this.pivot.add(this.mesh);

    // Shines from the sun's position toward its target, which stays at the terrain's center
    this.light = new THREE.DirectionalLight(SUN_COLOR, LIGHT_INTENSITY);
    this.light.position.copy(this.mesh.position);
    this.pivot.add(this.light);

    castTerrainShadows(this.light);
    this._updateColor();
  }

  /**
   * Turns the sun around the terrain by however much time has passed, so its speed doesn't depend on frame rate.
   * @param {number} delta: seconds since the last frame
   */
  update(delta) {
    this.pivot.rotation.x += ROTATION_SPEED * delta;
    this._updateColor();
  }

  /**
   * Blends the sun and its light from red-orange at the horizon to warm white overhead.
   */
  _updateColor() {
    const height = THREE.MathUtils.clamp(Math.sin(this.pivot.rotation.x), 0, 1);
    this.light.color.lerpColors(HORIZON_COLOR, OVERHEAD_COLOR, height);
    this.mesh.material.color.copy(this.light.color);
    // Below the horizon the light would shine up through the ground, so turn it off
    this.light.intensity = height > 0 ? LIGHT_INTENSITY : 0;
  }
}

/**
 * Makes a light that circles on the pivot cast shadows over the whole terrain.
 * Its shadow camera is a box looking from the light toward the terrain's center.
 * @param {THREE.DirectionalLight} light
 */
export function castTerrainShadows(light) {
  light.castShadow = true;
  light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  const shadowCamera = light.shadow.camera;
  shadowCamera.left = shadowCamera.bottom = -SHADOW_EXTENT;
  shadowCamera.right = shadowCamera.top = SHADOW_EXTENT;
  shadowCamera.near = 1;
  shadowCamera.far = ORBIT_RADIUS + SHADOW_EXTENT;
  light.shadow.bias = -0.0005; // Stops surfaces from shadowing themselves in stripes
}
