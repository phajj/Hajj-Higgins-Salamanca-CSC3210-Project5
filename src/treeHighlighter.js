import * as THREE from "three";

/**
 * Highlights the tree under the center dot.
 * Every frame a ray is cast from the camera through the center of the screen (where the dot is drawn),
 * and the closest tree or plant mesh it hits is found with THREE.Raycaster. If that mesh belongs to a tree,
 * the tree's materials are swapped for glowing copies until the dot moves off it.
 *
 * @author Jackson Higgins
 */

const SCREEN_CENTER = new THREE.Vector2(0, 0); // The dot, in normalized device coordinates
const HIGHLIGHT_COLOR = 0xffd54a;
const HIGHLIGHT_INTENSITY = 0.45;
const GROUND_STEP = 0.5; // Distance between ground checks when marching the ray over the terrain
const GROUND_REFINE_STEPS = 10;

export class TreeHighlighter {
  /**
   * @param {THREE.Camera} camera: the camera the dot is attached to
   * @param {Terrain} terrain: ground that can hide trees behind hills
   * @param {THREE.Object3D[]} targets: groups of trees and plants to raycast against
   *   (plants are included so a plant in front of a tree blocks it, but only trees highlight)
   */
  constructor(camera, terrain, targets) {
    this.camera = camera;
    this.terrain = terrain;
    this.targets = targets;
    this.raycaster = new THREE.Raycaster();
    this.highlighted = null; // The tree currently highlighted
    this.highlightMaterials = new Map(); // Original material -> its glowing copy
    this._point = new THREE.Vector3();
  }

  /**
   * Casts the ray through the dot and moves the highlight to whatever tree it hits first.
   * Call once per frame after the camera moves.
   */
  update() {
    this.camera.updateMatrixWorld(); // The camera may have moved since the last render
    this.raycaster.setFromCamera(SCREEN_CENTER, this.camera);
    // Anything past the point where the ray hits the ground is hidden behind a hill
    this.raycaster.far = this._groundDistance(this.raycaster.ray, this.camera.far);

    const hits = this.raycaster.intersectObjects(this.targets, true); 
    const hitPlant = hits.length > 0 ? hits[0].object.parent : null; // Each mesh's parent is its tree or plant group
    const tree = hitPlant?.userData.isTree ? hitPlant : null;

    if (tree === this.highlighted) return;
    if (this.highlighted) this._setHighlight(this.highlighted, false);
    if (tree) this._setHighlight(tree, true);
    this.highlighted = tree;
  }

  /**
   * Distance along the ray to where it first goes below the terrain, or maxDistance if it never does.
   */
  _groundDistance(ray, maxDistance) {
    const below = (distance) => {
      ray.at(distance, this._point);
      return this._point.y <= this.terrain.heightAt(this._point.x, this._point.z);
    };

    let previous = 0;
    for (let distance = GROUND_STEP; distance <= maxDistance; distance += GROUND_STEP) {
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
    return maxDistance;
  }

  /**
   * Swaps every mesh in the tree between its own material and a glowing copy of it.
   * Copies are swapped in per mesh rather than editing the material, since identical trees share one material.
   */
  _setHighlight(tree, on) {
    for (const mesh of tree.children) {
      if (on) {
        mesh.userData.baseMaterial = mesh.material;
        mesh.material = this._highlightMaterial(mesh.material);
      } else {
        mesh.material = mesh.userData.baseMaterial;
      }
    }
  }

  // Glowing copy of a material, made once and reused
  _highlightMaterial(material) {
    let glowing = this.highlightMaterials.get(material);
    if (!glowing) {
      glowing = material.clone();
      glowing.emissive.set(HIGHLIGHT_COLOR);
      glowing.emissiveIntensity = HIGHLIGHT_INTENSITY;
      this.highlightMaterials.set(material, glowing);
    }
    return glowing;
  }
}
