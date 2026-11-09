import * as THREE from "three";

/**
 * Creates the scene's perspective camera, looking at origin
 * (copied and modified from Project 2)
 * @param {number} aspect: viewport aspect ratio (width / height)
 * @returns {THREE.PerspectiveCamera}
 * 
 * @author Peter Hajj
 */

export function perspectiveCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 200);
  camera.rotation.order = "YXZ";
  camera.position.set(0, 1.7, 8); // Standing at eye height (by Claude Code)
  camera.lookAt(new THREE.Vector3(0, 1.7, 0));
  return camera;
}


