import * as THREE from "three";

/**
 * Highlights the patch of ground under the center dot
 * @Author Laura Salamanca
 */

const SCREEN_CENTER = new THREE.Vector2(0, 0);
const REACH = 30;
const GROUND_STEP = 0.5;
const GROUND_REFINE_STEPS = 10;

export class TerrainHighlighter {
  /**
   * @param {THREE.Camera} camera: the camera the dot is attached to
   * @param {Terrain} terrain: the ground to highlight
   */
  constructor(camera, terrain, targets = []) {
    this.camera = camera;
    this.terrain = terrain;
    this.targets = targets;
    this.raycaster = new THREE.Raycaster();
    this.hitPoint = new THREE.Vector3();
    this.onGround = false;
    this._point = new THREE.Vector3();
  }

  /**
   * Casts the ray through the dot and updates the ground highlight
   * Call once per frame after the camera moves
   */
  update() {
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(SCREEN_CENTER, this.camera);
    const ray = this.raycaster.ray;

    const groundDistance = this._groundDistance(ray, REACH);

    let blocked = false;
    if (groundDistance !== null && this.targets.length > 0) {
      this.raycaster.far = groundDistance;
      blocked = this.raycaster.intersectObjects(this.targets, true).length > 0;
    }

    this.onGround = groundDistance !== null && !blocked;

    if (this.onGround) {
      ray.at(groundDistance, this.hitPoint);
      this.terrain.setHighlight(this.hitPoint);
    } else {
      this.terrain.clearHighlight();
    }
  }

  /**
   * Distance along the ray to where it first goes below the terrain, or null if it never does
   * within maxDistance.
   */
  _groundDistance(ray, maxDistance) {
    const below = (distance) => {
      ray.at(distance, this._point);
      return (
        this._point.y <= this.terrain.heightAt(this._point.x, this._point.z)
      );
    };

    let previous = 0;
    for (
      let distance = GROUND_STEP;
      distance <= maxDistance;
      distance += GROUND_STEP
    ) {
      if (below(distance)) {
        let low = previous,
          high = distance;
        for (let i = 0; i < GROUND_REFINE_STEPS; i++) {
          const middle = (low + high) / 2;
          if (below(middle)) high = middle;
          else low = middle;
        }
        return high;
      }
      previous = distance;
    }
    return null;
  }
}
