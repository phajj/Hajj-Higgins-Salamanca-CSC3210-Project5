## LLM Prompts

This file records the prompts we gave to AI coding assistents and/or other LLMs for help while coding this project. It is orginaized by group member, each bullet depicts the initial prompt with the subbullets depicting the revision prompts.

## Peter (using Claude Code CLI)

- I am starting this walking simulator project built off of copying from a previvous spaceship astroid flying project. I believe I removed everything unneeded but read through the entire codebase and make sure there are no left over artifacts from the asteroid project (keywords to look for relate to astreroid, ship, cockpit, space, and simular words). Then after that search make a test geometry envirment for me to test the walking controls logic I added and flashlight. Ensure that the lighting it done in a way that I can see the (spotLight) flashlight I added.
  - Move @testEnvironment.js to its own directory with its own index.html file and gitignore that directory
- Fix the spotlight (flashlight) to properly aim forward (from the users perspective). Currently it follows the camera perfectly but angled above the user
  - Raised the flashlight's aim by about 20 degrees because the beam looked like it pointed too far below the camera.
- Help me fix the (PointerLockControls) controls I added to properly hide the curser
- Call updateBobbing function in each case of the if statements in updateMovements
- Fix the camera movement to use delta time
- Handle the merge conflict
- I just made the @src/playerBody.js with export createBody, export moveArms and export moveLegs functions. In @src/main.js import the body and call both move functions in the updateMovement function. Ensure it casts a shadow
  - Doubled the body's geometry sizes and positions so the shadow is about twice as big, and halved how fast the arms and legs swing.
  - Made the arms and legs smoothly ease back to their original angle when the player stops moving.
- Update the @README.md with a brief one-two sentence overview in the overview section and put the controls in the how to play section
- Make the sky blue when the sun is out (and keep it black when the moon is out)

## Jackson

- I have implemented the fractalPlan.js stochasticPine.js, stochasticTree.js, and ternaryTree.js files with their grammar rules. Help me create an lsystem.js parser to generate the plants and trees from the rules. Use https://en.wikipedia.org/wiki/L-system as a reference
- Help me correct the math behind tree and plant placement so they do not overlap

## Laura

- Using this terrain base help me add perlin noise to add varying heights to the terrain that is unique to each reload of the page.
- How to add a grainy grass-like texture to the terrain
- Help me update the updateColors method to turn the terrain a brown color when the hole is being dug
