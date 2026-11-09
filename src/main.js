import * as THREE from "three";
import { perspectiveCamera } from "./camera.js";

const MOUSE_SENSITIVITY = 0.002;
const CAMERA_MOVE_SPEED = 0.05;
const FLASHLIGHT_TILT_UP = THREE.MathUtils.degToRad(30); // How far above the view direction the beam aims

// Scene (exported so test pages can add geometry to it)
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera (perspective)
const camera = perspectiveCamera(window.innerWidth / window.innerHeight);

// Lighting (ambient + flashlight)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Faintly visible so the flashlight stands out (TEMPORARY for testing, adjust when implementing day/night lighting)
const flashlight = new THREE.SpotLight(0xfff2d9, 40, 25, Math.PI / 7, 0.4, 2); // SpotLight(color, intensity, distance, cone angle, penumbra (soft edge), decay) (adjusted by Claude Code)

// Flashflight points same direction as camera (child of camera)
camera.add(flashlight);
camera.add(flashlight.target);
// Target 1 unit ahead (-z), raised by tan(tilt) so the beam points FLASHLIGHT_TILT_UP above straight ahead
flashlight.target.position.set(0, Math.tan(FLASHLIGHT_TILT_UP), -1);
flashlight.visible = true; // Defaults on (f key toggles off)

// The camera has to be in the scene graph for its child light to be rendered
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

/**
 * Handles keyboard input for perspectiveCamera movement:
 * w a s d
 * f toggles flashlight on/off
 * (copied from Project 2)
 */
function keyboardInput() {
  // Handle keydown events to start movement
  window.addEventListener("keydown", (event) => {
    if (event.key.toLocaleLowerCase() === "w")
      wPresssed = true;
    if (event.key.toLocaleLowerCase() === "a")
      aPresssed = true;
    if (event.key.toLocaleLowerCase() === "s")
      sPresssed = true;
    if (event.key.toLocaleLowerCase() === "d")
      dPresssed = true;
    // Toggle flashlight on/off
    if (event.key.toLocaleLowerCase() === "f")
      flashlight.visible = !flashlight.visible;
  });

  // Handle keyup events to stop movement
  window.addEventListener("keyup", (event) => {
    if (event.key.toLocaleLowerCase() === "w")
      wPresssed = false;
    if (event.key.toLocaleLowerCase() === "a")
      aPresssed = false;
    if (event.key.toLocaleLowerCase() === "s")
      sPresssed = false;
    if (event.key.toLocaleLowerCase() === "d")
      dPresssed = false;
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

  if (wPresssed)
    movement.add(forward);
  if (aPresssed)
    movement.sub(right);
  if (sPresssed)
    movement.sub(forward);
  if (dPresssed)
    movement.add(right);
  // Normalize combined input so diagonal movement has the same speed.
  if (movement.lengthSq() > 0)
    camera.position.addScaledVector(movement.normalize(), CAMERA_MOVE_SPEED);
}

/**
 * Rotates the perspective camera by how far the mouse moved since the last event.
 * @param {MouseEvent} event
 * (copied from project 2)
 */
function onMouseMove(event) {
  camera.rotation.y -= event.movementX * MOUSE_SENSITIVITY;
  camera.rotation.x = THREE.MathUtils.clamp(
    camera.rotation.x - event.movementY * MOUSE_SENSITIVITY,
    -Math.PI / 2 + 0.01,
    Math.PI / 2 - 0.01
  );
}

document.addEventListener("mousemove", onMouseMove);
keyboardInput();

/**
 * Render loop, called once per frame
 */
function animate() {
  updateMovement();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
