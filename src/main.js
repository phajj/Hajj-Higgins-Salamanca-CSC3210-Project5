import * as THREE from "three";
import { perspectiveCamera } from "./camera.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Terrain } from "./terrain.js";
import { populateForest } from "./forest.js";
import { TreeHighlighter } from "./treeHighlighter.js";
import { Sun } from "./sun.js";
import { Moon } from "./moon.js";

const MOUSE_SENSITIVITY = 0.002;
const CAMERA_MOVE_SPEED = 0.05;
const TREE_COLLISION_RADIUS = 0.7; // How close the camera can get to a tree's center (trunk + body width)
const FLASHLIGHT_TILT_UP = THREE.MathUtils.degToRad(30); // How far above the view direction the beam aims

// Scene (exported so test pages can add geometry to it)
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softens shadow edges
document.body.appendChild(renderer.domElement);

// Camera (perspective)
const camera = perspectiveCamera(window.innerWidth / window.innerHeight);

// Lighting (ambient + flashlight)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Faintly visible so the flashlight stands out (TEMPORARY for testing, adjust when implementing day/night lighting)
const flashlight = new THREE.SpotLight(0xfff2d9, 40, 25, Math.PI / 7, 0.4, 2); // SpotLight(color, intensity, distance, cone angle, penumbra (soft edge), decay) (adjusted by Claude Code)

// Flashflight points same direction as camera (child of camera)
camera.add(flashlight);
camera.add(flashlight.target);
// Target 1 unit ahead (-z), raised by tan(tilt) so the beam points FLASHLIGHT_TILT_UP above straight ahead (by Claude Code)
flashlight.target.position.set(0, Math.tan(FLASHLIGHT_TILT_UP), -1);
flashlight.visible = true; // Defaults on (f key toggles off)

scene.add(camera);
scene.add(ambientLight);

// Keep the camera and the renderer in sync with the window size
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Keyboard input handling
var wPresssed = false;
var aPresssed = false;
var sPresssed = false;
var dPresssed = false;

// Hides the cursor
const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = MOUSE_SENSITIVITY / 0.002;
// Lock the pointer when clicked, and unlock when ESC is pressed (default behavior of PointerLockControls) (by Claude Code)
renderer.domElement.addEventListener("click", () => controls.lock());

// Small dot in center of screen to replace cursor
const dotCursor = new THREE.CircleGeometry(0.005, 32);
const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const dotMesh = new THREE.Mesh(dotCursor, dotMaterial);
dotMesh.position.set(0, 0, -1);
camera.add(dotMesh);

/**
 * Handles keyboard input for perspectiveCamera movement:
 * w a s d
 * f toggles flashlight on/off
 * (copied from Project 2)
 */
function keyboardInput() {
  // Handle keydown events to start movement
  window.addEventListener("keydown", (event) => {
    if (event.key.toLocaleLowerCase() === "w") wPresssed = true;
    if (event.key.toLocaleLowerCase() === "a") aPresssed = true;
    if (event.key.toLocaleLowerCase() === "s") sPresssed = true;
    if (event.key.toLocaleLowerCase() === "d") dPresssed = true;
    // Toggle flashlight on/off
    if (event.key.toLocaleLowerCase() === "f")
      flashlight.visible = !flashlight.visible;
  });

  // Handle keyup events to stop movement
  window.addEventListener("keyup", (event) => {
    if (event.key.toLocaleLowerCase() === "w") wPresssed = false;
    if (event.key.toLocaleLowerCase() === "a") aPresssed = false;
    if (event.key.toLocaleLowerCase() === "s") sPresssed = false;
    if (event.key.toLocaleLowerCase() === "d") dPresssed = false;
  });
}

// Reused every frame by updateMovement() instead of allocating new vectors
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const movement = new THREE.Vector3();

/**
 * Moves the perspective camera with WASD.
 * Called every frame from animate() so multiple keys can be held at once.
 * (copied from project 2)
 */
function updateMovement() {
  // Use the camera's view and horizontal axes so WASD follows its orientation
  camera.getWorldDirection(forward);
  // Flatten camera on the ground terrain
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  movement.set(0, 0, 0);

  if (wPresssed) movement.add(forward);
  if (aPresssed) movement.sub(right);
  if (sPresssed) movement.sub(forward);
  if (dPresssed) movement.add(right);
  // Normalize combined input so diagonal movement has the same speed.
  if (movement.lengthSq() > 0) {
    // (assisted by Claude Code)
    movement.normalize().multiplyScalar(CAMERA_MOVE_SPEED);
    // Only take the step if it doesn't walk into a tree
    if (!hitsTree(camera.position.x + movement.x, camera.position.z + movement.z))
      camera.position.add(movement);
    updateBobbing();
  } else {
    // Reset to standing eye height above the ground
    activeBobbingTime = 0;
    camera.position.y = groundHeight() + baseCameraY;
  }
}

// True if (x, z) is within TREE_COLLISION_RADIUS of any tree
function hitsTree(x, z) {
  return forest.trees.children.some(
    (tree) => Math.hypot(x - tree.position.x, z - tree.position.z) < TREE_COLLISION_RADIUS
  );
}

// Bobbing state
let activeBobbingTime = 0;
const baseCameraY = camera.position.y;

// Terrain height directly under the camera
function groundHeight() {
  return terrain.heightAt(camera.position.x, camera.position.z);
}

/**
 * Adds bobbing to first person view while moving.
 * Called once per frame from updateMovement() while any movement key is held.
 * (not to be confused with Bob and Alice)
 */
function updateBobbing() {
  const bobbingSpeed = 0.1;
  const bobbingAmount = 0.075;
  activeBobbingTime += bobbingSpeed;
  // Calculate the bobbing offset using a sine wave
  const bobbingOffset = Math.sin(activeBobbingTime) * bobbingAmount;
  // Set the height so the offset doesn't build up frame to frame (assisted by Claude Code)
  camera.position.y = groundHeight() + baseCameraY + bobbingOffset;
}

keyboardInput();

//Add terrain
const terrain = new Terrain({ size: 400, segments: 200, amplitude: 12 });
terrain.mesh.receiveShadow = true; // So tree shadows show up on the ground
scene.add(terrain.mesh);

// Add trees and plants, and highlight the tree under the dot
const forest = populateForest(terrain, camera.position);
scene.add(forest.trees, forest.plants);
const treeHighlighter = new TreeHighlighter(camera, terrain, [forest.trees, forest.plants]);

// Add the sun, which circles the terrain
const sun = new Sun();
scene.add(sun.pivot, sun.light.target);

const moon = new Moon(sun);
scene.add(moon.light.target);

// Measures the time between frames so the sun moves at the same speed at any frame rate
const clock = new THREE.Clock();

/**
 * Render loop, called once per frame
 */
function animate() {
  const delta = clock.getDelta();
  sun.update(delta);
  moon.update();
  updateMovement();
  treeHighlighter.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
