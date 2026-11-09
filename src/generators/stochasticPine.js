import { expand, buildLSystem, TREE_SCALE } from "./lsystem.js";

/**
 * Stochastic pine: a straight trunk (T) that grows a ring of side branches each step.
 * Lower rings are older, so their branches have been rewritten more times and are longer, which makes a cone shape.
 *   T  50% ring of three branches, 50% ring of two branches (then rolls so the next ring is offset)
 *   L  60% branch grows longer, 40% branch forks left and right
 * The constant * leaves a tuft of needles behind at every step, so needles cover the branches and trunk top, not just the tips.
 *
 * With a 30 degree angle, "&&" pitches a branch 60 degrees away from the trunk.
 * 
 * @author Jackson Higgins
 */
export const stochasticPineGrammar = {
  axiom: "FT",
  rules: {
    T: [
      { probability: 0.5, successor: "F[&&L]////[&&L]////[&&L]/*T" },
      { probability: 0.5, successor: "F[&&L]//////[&&L]///*T" },
    ],
    L: [
      { probability: 0.6, successor: "F*L" },
      { probability: 0.4, successor: "F*[+L][-L]" },
    ],
  },
};

/**
 * @param {number} iterations: how many times the grammar is rewritten (one trunk ring per iteration)
 * @param {number} height: trunk height in meters (the trunk grows one segment per iteration, so it is always this tall)
 * @param {function} random: returns a number in [0, 1); pass a seeded generator to repeat a tree
 * @returns {THREE.Group} tree with its base at the origin
 */
export function createStochasticPine(iterations = 7, height = 3.5 * TREE_SCALE, random = Math.random) {
  const sentence = expand(stochasticPineGrammar.axiom, stochasticPineGrammar.rules, iterations, random);
  const length = height / (iterations + 1); // Trunk is the axiom's F plus one F per iteration
  return buildLSystem(sentence, {
    angle: 30,
    length,
    radius: length * 0.25,
    lengthScale: 0.6, // Side branches use shorter segments than the trunk
    radiusScale: 0.3,
    taper: 0.9,
    jitter: 8,
    tropism: -0.05, // Branches droop a little under their own weight
    leafShape: "needle",
    leafSize: length * 0.3,
    leavesPerCluster: 16,
    branchColor: 0x4a3426,
    leafColor: 0x1f4d2b,
    random,
  });
}
