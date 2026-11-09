import { expand, buildLSystem, TREE_SCALE } from "./lsystem.js";

/**
 * Stochastic leafy tree: a random version of the ternary tree.
 * Each time a bud (L) is rewritten it picks one rule by probability, so every call gives a different tree:
 *   50%  grow and split into three branches
 *   30%  grow and split into two branches
 *   20%  just grow longer
 *
 * With a 30 degree angle, "////" rolls 120 degrees and "//////" rolls 180 degrees.
 * 
 * @author Jackson Higgins
 */
export const stochasticTreeGrammar = {
  axiom: "FL",
  rules: {
    L: [
      { probability: 0.5, successor: "F[&L]////[&L]////[&L]" },
      { probability: 0.3, successor: "F[&L]//////[&L]" },
      { probability: 0.2, successor: "FL" },
    ],
  },
};

/**
 * @param {number} iterations: how many times the grammar is rewritten
 * @param {number} height: height in meters of a fully branched tree; sparser random trees come out shorter, like younger trees
 * @param {function} random: returns a number in [0, 1); pass a seeded generator to repeat a tree
 * @returns {THREE.Group} tree with its base at the origin
 */
export function createStochasticTree(iterations = 5, height = 3 * TREE_SCALE, random = Math.random) {
  const sentence = expand(stochasticTreeGrammar.axiom, stochasticTreeGrammar.rules, iterations, random);
  const length = height / 4; // A fully branched tree is about 4 trunk segments tall
  return buildLSystem(sentence, {
    angle: 30,
    length,
    radius: length * 0.14,
    lengthScale: 0.75,
    radiusScale: 0.7,
    taper: 0.85,
    jitter: 12,
    tropism: 0.1, // Branches curve up toward the light
    leafShape: "leaf",
    leafSize: length * 0.18,
    leavesPerCluster: 10,
    branchColor: 0x4e3b2c,
    leafColor: 0x4c8a2e,
    random,
  });
}
