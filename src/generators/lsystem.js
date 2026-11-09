import * as THREE from "three";

/**
 * Shared L-system core used by every grammar in this folder.
 * Logic follows https://en.wikipedia.org/wiki/L-system
 *
 * A grammar's rules map a symbol to its successor:
 *   - deterministic: { F: "FF" }
 *   - stochastic:    { L: [{ probability: 0.5, successor: "F[+L]" }, { probability: 0.5, successor: "L" }] }
 * Symbols with no rule are constants and copy over unchanged.
 *
 * Turtle symbols (heading starts straight up, +Y):
 *   F      draw a branch segment forward
 *   L      draw a cluster of leaves (a grammar can also use L as a bud variable, so leftover buds become leaves)
 *   *      draw a cluster of leaves (a constant, for foliage along a branch instead of only at the tips)
 *   + / -  turn left / right   (around the turtle's local Z axis)
 *   & / ^  pitch down / up     (around the turtle's local X axis)
 *   / / \  roll left / right   (around the turtle's local Y axis, the heading)
 *   [ / ]  push / pop the turtle's state (start / end a branch)
 *   anything else (X, T, ...) only controls how the grammar grows and draws nothing
 * 
 * @author Jackson Higgins
 */

/**
 * Rewrites the axiom with the rules, once per iteration.
 * @param {string} axiom: starting string
 * @param {Object} rules: symbol -> successor string, or a list of { probability, successor } for stochastic rules
 * @param {number} iterations: how many times to rewrite
 * @param {function} random: returns a number in [0, 1), so a seeded generator can be passed in
 * @returns {string} the final string
 */
export function expand(axiom, rules, iterations, random = Math.random) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    const next = [];
    for (const symbol of current) {
      const rule = rules[symbol];
      if (rule === undefined)
        next.push(symbol); // Constant
      else if (typeof rule === "string")
        next.push(rule); // Deterministic rule
      else
        next.push(pickSuccessor(rule, random())); // Stochastic rule
    }
    current = next.join("");
  }
  return current;
}

/**
 * Picks one successor from a stochastic rule using a random roll in [0, 1).
 */
function pickSuccessor(choices, roll) {
  for (const { probability, successor } of choices) {
    roll -= probability;
    if (roll < 0)
      return successor;
  }
  return choices[choices.length - 1].successor; // Guards against probabilities that sum to slightly under 1
}

/**
 * Ratio every tree's default height is multiplied by. Everything about a tree (branch lengths, thickness, leaf size)
 * is derived from its height, so this scales the trees up evenly without changing their shape.
 */
export const TREE_SCALE = 3;

/**
 * Small seeded random number generator (mulberry32), so a plant's random details come out the same every time.
 * @param {number} seed: any integer
 * @returns {function} returns a number in [0, 1)
 */
export function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Leaf shapes, each with its base at the origin and pointing up +Y (about 2 units long before leafSize scales them)
const LEAF_GEOMETRIES = {
  leaf: new THREE.SphereGeometry(1, 6, 3).scale(0.45, 1, 0.08).translate(0, 1, 0), // Flat oval leaf
  needle: new THREE.ConeGeometry(0.08, 2, 3).translate(0, 1, 0), // Thin pine needle
};

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Axis and direction for each rotation symbol
const ROTATIONS = {
  "+": [Z_AXIS, 1],
  "-": [Z_AXIS, -1],
  "&": [X_AXIS, 1],
  "^": [X_AXIS, -1],
  "/": [Y_AXIS, 1],
  "\\": [Y_AXIS, -1],
};

/**
 * Walks the string with a 3D turtle and builds the plant out of Phong meshes, so it reacts to scene lights.
 * Every branch segment is one instance of a single InstancedMesh (and the same for leaves), so even large plants are one draw call each.
 * @param {string} sentence: the expanded L-system string
 * @param {Object} options
 * @param {number} options.angle: turn angle in degrees for + - & ^ / \
 * @param {number} options.length: length of one F segment
 * @param {number} options.radius: starting radius of the trunk
 * @param {number} options.lengthScale: length multiplier applied on each [ (branches get shorter)
 * @param {number} options.radiusScale: radius multiplier applied on each [ (branches get thinner)
 * @param {number} options.taper: radius multiplier applied after each F, so branches narrow smoothly toward the tips
 * @param {number} options.jitter: random variation in degrees added to every turn, so branches are not perfectly regular
 * @param {number} options.branchRoll: random roll in degrees (either way) at the start of each branch, which spreads flat grammars into 3D
 * @param {number} options.tropism: how much each segment bends toward vertical (positive grows up toward light, negative droops)
 * @param {string} options.leafShape: "leaf" (flat oval) or "needle" (pine needle)
 * @param {number} options.leafSize: size of one leaf (a leaf is about twice this long)
 * @param {number} options.leavesPerCluster: leaves drawn for each L or *
 * @param {number} options.branchColor
 * @param {number} options.leafColor: base leaf color; each leaf is varied a little from it
 * @param {number} options.height: if given, the whole plant is scaled so it is this tall
 * @param {function} options.random: returns a number in [0, 1); drives jitter, roll, and leaf placement
 * @returns {THREE.Group} the plant, with its base at the group's origin
 */
export function buildLSystem(sentence, {
  angle = 25,
  length = 1,
  radius = 0.1,
  lengthScale = 1,
  radiusScale = 1,
  taper = 1,
  jitter = 0,
  branchRoll = 0,
  tropism = 0,
  leafShape = "leaf",
  leafSize = 0.15,
  leavesPerCluster = 6,
  branchColor = 0x5b3a1e,
  leafColor = 0x3f7f2f,
  height,
  random = seededRandom(1),
} = {}) {
  const turn = THREE.MathUtils.degToRad(angle);
  const jitterAngle = THREE.MathUtils.degToRad(jitter);
  const rollAngle = THREE.MathUtils.degToRad(branchRoll);
  const randomSigned = () => random() * 2 - 1; // Random number in [-1, 1)

  let turtle = { position: new THREE.Vector3(), orientation: new THREE.Quaternion(), length, radius };
  const stack = [];
  const branchMatrices = [];
  const leafMatrices = [];
  const leafColors = [];

  // Reused scratch objects
  const rotation = new THREE.Quaternion();
  const leafOrientation = new THREE.Quaternion();
  const heading = new THREE.Vector3();
  const bendAxis = new THREE.Vector3();
  const scale = new THREE.Vector3();

  for (const symbol of sentence) {
    if (symbol === "F") {
      scale.set(turtle.radius, turtle.length, turtle.radius);
      branchMatrices.push(new THREE.Matrix4().compose(turtle.position, turtle.orientation, scale));
      heading.copy(Y_AXIS).applyQuaternion(turtle.orientation);
      turtle.position.addScaledVector(heading, turtle.length);
      turtle.radius *= taper;

      // Tropism: bend the heading toward straight up (or down), more when the branch is closer to horizontal
      bendAxis.crossVectors(heading, Y_AXIS);
      const bend = tropism * bendAxis.length();
      if (bend !== 0) {
        rotation.setFromAxisAngle(bendAxis.normalize(), bend);
        turtle.orientation.premultiply(rotation); // World-space rotation
      }
    } else if (symbol === "L" || symbol === "*") {
      for (let i = 0; i < leavesPerCluster; i++) {
        // Spin each leaf randomly around the branch, then tilt it 20 to 80 degrees outward
        leafOrientation.copy(turtle.orientation)
          .multiply(rotation.setFromAxisAngle(Y_AXIS, random() * Math.PI * 2))
          .multiply(rotation.setFromAxisAngle(X_AXIS, THREE.MathUtils.degToRad(20 + random() * 60)));
        scale.setScalar(leafSize * (0.8 + random() * 0.4));
        leafMatrices.push(new THREE.Matrix4().compose(turtle.position, leafOrientation, scale));
        leafColors.push(new THREE.Color(leafColor).offsetHSL(randomSigned() * 0.03, randomSigned() * 0.1, randomSigned() * 0.08));
      }
    } else if (symbol in ROTATIONS) {
      const [axis, direction] = ROTATIONS[symbol];
      rotation.setFromAxisAngle(axis, direction * turn + randomSigned() * jitterAngle);
      turtle.orientation.multiply(rotation); // Rotate in the turtle's local frame
    } else if (symbol === "[") {
      stack.push({
        position: turtle.position.clone(),
        orientation: turtle.orientation.clone(),
        length: turtle.length,
        radius: turtle.radius,
      });
      turtle.length *= lengthScale;
      turtle.radius *= radiusScale;
      if (rollAngle !== 0)
        turtle.orientation.multiply(rotation.setFromAxisAngle(Y_AXIS, randomSigned() * rollAngle));
    } else if (symbol === "]") {
      turtle = stack.pop();
    }
  }

  // Each segment's top is `taper` times its bottom, matching the radius shrink after each F so segments join smoothly
  const branchGeometry = new THREE.CylinderGeometry(taper, 1, 1, 6).translate(0, 0.5, 0);

  const plant = new THREE.Group();
  plant.add(createInstancedMesh(branchGeometry, new THREE.MeshPhongMaterial({ color: branchColor }), branchMatrices));
  if (leafMatrices.length > 0) {
    // White material so each leaf's instance color shows as is
    const leafMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
    plant.add(createInstancedMesh(LEAF_GEOMETRIES[leafShape], leafMaterial, leafMatrices, leafColors));
  }

  if (height !== undefined) {
    const size = new THREE.Box3().setFromObject(plant).getSize(new THREE.Vector3());
    plant.scale.setScalar(height / size.y); // Scales around the base, so the base stays at the origin
  }
  return plant;
}

/**
 * Puts one copy of the geometry at each matrix, optionally with its own color.
 */
function createInstancedMesh(geometry, material, matrices, colors) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  if (colors) {
    colors.forEach((color, i) => mesh.setColorAt(i, color));
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.computeBoundingSphere(); // So frustum culling covers every instance, not just the unit shape
  return mesh;
}
