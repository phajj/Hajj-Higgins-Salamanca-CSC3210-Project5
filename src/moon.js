import * as THREE from "three";
import { ORBIT_RADIUS, castTerrainShadows } from "./sun.js";

/**
 * The moon: a silver sphere with a dark blue directional light.
 * It sits on the sun's pivot on the opposite side, so it is always exactly 180 degrees from the sun
 * and rises as the sun sets.
 *
 * @author Jackson Higgins
 */

const MOON_COLOR = 0xc8ccd4; // Silver
const LIGHT_COLOR = 0x2a3f8f; // Dark blue
const LIGHT_INTENSITY = 1;

export class Moon {
  /**
   * @param {Sun} sun: the sun whose pivot the moon rides on
   */
  constructor(sun) {
    this.pivot = sun.pivot;

    // Same sphere as the sun, on the opposite side of the pivot (the sun is at -z)
    this.mesh = new THREE.Mesh(sun.mesh.geometry, new THREE.MeshBasicMaterial({ color: MOON_COLOR }));
    this.mesh.position.set(0, 0, ORBIT_RADIUS);
    this.pivot.add(this.mesh);

    // Shines from the moon's position toward its target, which stays at the terrain's center
    this.light = new THREE.DirectionalLight(LIGHT_COLOR, LIGHT_INTENSITY);
    this.light.position.copy(this.mesh.position);
    this.pivot.add(this.light);
    castTerrainShadows(this.light);

    this.update();
  }

  /**
   * Turns the moonlight off while the moon is below the horizon. The sun already turns the shared pivot.
   * Call once per frame after the sun's update.
   */
  update() {
    // The moon is opposite the sun
    const height = -Math.sin(this.pivot.rotation.x);
    this.light.intensity = height > 0 ? LIGHT_INTENSITY : 0;
  }
}
