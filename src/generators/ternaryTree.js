import { expand, buildLSystem, TREE_SCALE } from "./lsystem.js";

/**
 * Deterministic tree: every bud (L) grows a segment and splits into three branches spaced 120 degrees apart.
 * The same settings always give the same tree.
 *
 * With a 30 degree angle, "////" rolls the turtle 120 degrees around its heading.
 * 
 * @author Jackson Higgins
 */
export const ternaryTreeGrammar = {
  axiom: "FL",
  rules: {
    L: "F[&L]////[&L]////[&L]",
  },
};

/**
 * @param {number} iterations: how many times the grammar is rewritten
 * @param {number} height: tree height in meters
 * @returns {THREE.Group} tree with its base at the origin
 */
export function createTernaryTree(iterations = 4, height = 3 * TREE_SCALE) {
  const sentence = expand(ternaryTreeGrammar.axiom, ternaryTreeGrammar.rules, iterations);
  return buildLSystem(sentence, {
    angle: 30,
    length: 1,
    radius: 0.14,
    lengthScale: 0.75,
    radiusScale: 0.7,
    taper: 0.85,
    jitter: 5, // Uses the default seeded random, so this tree still comes out the same every time
    tropism: 0.08, // Branches curve up toward the light
    leafShape: "leaf",
    leafSize: 0.18,
    leavesPerCluster: 10,
    branchColor: 0x5a4030,
    leafColor: 0x3f7f2f,
    height,
  });
}
