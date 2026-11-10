import * as THREE from "three";

/**
 * The sun: a glowing sphere with a directional light, circling the terrain about the x axis.
 * Both sit on a pivot at the terrain's center, so turning the pivot moves them together.
 *
 * @author Jackson Higgins
 */

const ORBIT_RADIUS = 150; // Distance from the terrain's center (kept inside the camera's far plane of 200)
const SUN_SIZE = 8;
const SUN_COLOR = 0xfff2a0;
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

    // The shadow camera is a box looking from the sun toward the center, sized to cover the whole terrain
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    const shadowCamera = this.light.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -SHADOW_EXTENT;
    shadowCamera.right = shadowCamera.top = SHADOW_EXTENT;
    shadowCamera.near = 1;
    shadowCamera.far = ORBIT_RADIUS + SHADOW_EXTENT;
    this.light.shadow.bias = -0.0005; // Stops surfaces from shadowing themselves in stripes
  }

  /**
   * Turns the sun around the terrain by however much time has passed, so its speed doesn't depend on frame rate.
   * @param {number} delta: seconds since the last frame
   */
  update(delta) {
    this.pivot.rotation.x += ROTATION_SPEED * delta;
  }
}
