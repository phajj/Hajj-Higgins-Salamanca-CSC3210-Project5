import * as THREE from "three";
import { createTernaryTree } from "./generators/ternaryTree.js";
import { createStochasticTree } from "./generators/stochasticTree.js";
import { createStochasticPine } from "./generators/stochasticPine.js";
import { createFractalPlant } from "./generators/fractalPlant.js";

/**
 * Scatters the trees and plants across the terrain.
 * Each tree or plant is its own THREE.Group
 *
 * @author Jackson Higgins
 */

const TREES_PER_TYPE = 100;
const PLANT_COUNT = 400;
const PLANT_ITERATIONS = 5;

const EDGE_MARGIN = 5; // Keeps everything this far inside the terrain's edge
const SPAWN_CLEARANCE = 6; // Keeps the player's starting spot clear
const TREE_RADIUS = 2; // Space kept around each tree trunk
const PLANT_RADIUS = 0.5; // Space kept around each plant
const SINK_DEPTH = 0.2; // Pushes bases slightly into the ground so they don't float on slopes
const MAX_PLACEMENT_TRIES = 200;

/**
 * @param {Terrain} terrain: the ground to place on (uses its size and heightAt)
 * @param {THREE.Vector3} spawn: the player's starting position, kept clear
 * @returns {{ trees: THREE.Group, plants: THREE.Group }} groups holding every tree and every plant
 */
export function populateForest(terrain, spawn) {
  const trees = new THREE.Group();
  const plants = new THREE.Group();
  const taken = []; // { x, z, radius } of everything placed so far

  // The ternary tree and fractal plant come out the same every time, so build each once and share its data
  const ternaryTemplate = createTernaryTree();
  const plantTemplate = createFractalPlant(PLANT_ITERATIONS);

  for (let i = 0; i < TREES_PER_TYPE; i++) {
    place(trees, shareCopy(ternaryTemplate), "ternaryTree", true, TREE_RADIUS);
    place(trees, createStochasticTree(), "stochasticTree", true, TREE_RADIUS);
    place(trees, createStochasticPine(), "stochasticPine", true, TREE_RADIUS);
  }
  for (let i = 0; i < PLANT_COUNT; i++)
    place(plants, shareCopy(plantTemplate), "fractalPlant", false, PLANT_RADIUS);

  return { trees, plants };

  // Puts the object at a free random spot on the ground with a random turn and size
  function place(parent, object, type, isTree, radius) {
    const { x, z } = findFreeSpot(terrain, spawn, taken, radius);
    taken.push({ x, z, radius });
    object.position.set(x, terrain.heightAt(x, z) - SINK_DEPTH, z);
    object.rotation.y = Math.random() * Math.PI * 2;
    object.scale.multiplyScalar(0.85 + Math.random() * 0.3);
    object.userData = { isTree, type };
    parent.add(object);
  }
}

/**
 * Picks a random (x, z) on the terrain that isn't too close to the edge, the spawn, or anything already placed.
 * Gives up after MAX_PLACEMENT_TRIES and uses the last try, so a crowded map can't loop forever.
 */
function findFreeSpot(terrain, spawn, taken, radius) {
  const range = terrain.half - EDGE_MARGIN;
  let x, z;
  for (let attempt = 0; attempt < MAX_PLACEMENT_TRIES; attempt++) {
    x = (Math.random() * 2 - 1) * range;
    z = (Math.random() * 2 - 1) * range;
    if (Math.hypot(x - spawn.x, z - spawn.z) < SPAWN_CLEARANCE + radius) continue;
    if (taken.every((spot) => Math.hypot(x - spot.x, z - spot.z) >= spot.radius + radius)) break;
  }
  return { x, z };
}

/**
 * Makes a copy of a plant built by buildLSystem that shares the template's geometry, material,
 * and per-instance matrices and colors, so the copy costs no extra memory.
 */
function shareCopy(template) {
  const copy = new THREE.Group();
  for (const source of template.children) {
    const mesh = new THREE.InstancedMesh(source.geometry, source.material, 0);
    mesh.instanceMatrix = source.instanceMatrix;
    mesh.instanceColor = source.instanceColor;
    mesh.count = source.count;
    mesh.boundingSphere = source.boundingSphere;
    copy.add(mesh);
  }
  copy.scale.copy(template.scale); // Keeps the template's height scaling
  return copy;
}
