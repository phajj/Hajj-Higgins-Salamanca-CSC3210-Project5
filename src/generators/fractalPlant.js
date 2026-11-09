import { expand, buildLSystem } from "./lsystem.js";

/**
 * Fractal plant, Example 7 from https://en.wikipedia.org/wiki/L-system
 *   variables: X F
 *   constants: + - [ ]
 *   start:     -X
 *   rules:     X -> F+[[X]-X]-F[-FX]+X
 *              F -> FF
 *   angle:     25 degrees
 * 
 * F draws forward, - turns right 25 degrees, + turns left 25 degrees, X draws nothing,
 * [ pushes the position and angle, ] pops them.
 * The grammar only turns around one axis (flat, like the 2D original), so each branch gets a small random roll
 * when it starts to spread the plant into 3D. The grammar itself is unchanged.
 * 
 * @author Jackson Higgins
 */
export const fractalPlantGrammar = {
  axiom: "-X",
  rules: {
    X: "F+[[X]-X]-F[-FX]+X",
    F: "FF",
  },
};

/**
 * @param {number} iterations: how many times the grammar is rewritten (6 matches the Wikipedia image)
 * @param {number} height: plant height in meters
 * @returns {THREE.Group} plant with its base at the origin
 */
export function createFractalPlant(iterations = 6, height = 0.8) {
  const sentence = expand(fractalPlantGrammar.axiom, fractalPlantGrammar.rules, iterations);
  return buildLSystem(sentence, {
    angle: 25,
    length: 1,
    radius: 1.2,
    radiusScale: 0.85,
    taper: 0.985,
    jitter: 5, // Uses the default seeded random, so the plant still comes out the same every time
    branchRoll: 35,
    branchColor: 0x4f8f35,
    height,
  });
}
