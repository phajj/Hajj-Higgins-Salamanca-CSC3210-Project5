/**
 * This class represents the plays body to cast shadow.
 * It creates an invisible body with no materials, only used to cast shadows.
 * (assisted by GitHub Copilot auto-complete for dementions and body-part locations)
 * @author Peter Hajj
 */

import * as THREE from "three";

// Draws nothing to the screen (no color, no depth), but still renders into the shadow map (assisted by Claude Code)
const shadowOnlyMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

const head = new THREE.SphereGeometry(0.4, 32, 32);

const torso = new THREE.CylinderGeometry(0.4, 0.4, 1, 32);

const leftArm = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 32);
const rightArm = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 32);

const leftLeg = new THREE.CylinderGeometry(0.2, 0.2, 1, 32);
const rightLeg = new THREE.CylinderGeometry(0.2, 0.2, 1, 32);

const playerBody = new THREE.Group();

/**
 * Creates the players body with no materials or meshes, only used for casting shadows
 * @returns {THREE.Group} The players body
 */
export function createPlayerBody() {
    // Head
    const headMesh = new THREE.Mesh(head);
    headMesh.position.set(0, 3, 0);
    playerBody.add(headMesh);

    // Torso
    const torsoMesh = new THREE.Mesh(torso);
    torsoMesh.position.set(0, 2, 0);
    playerBody.add(torsoMesh);

    // Left Arm
    const leftArmMesh = new THREE.Mesh(leftArm);
    leftArmMesh.position.set(-0.6, 2.4, 0);
    playerBody.add(leftArmMesh);

    // Right Arm
    const rightArmMesh = new THREE.Mesh(rightArm);
    rightArmMesh.position.set(0.6, 2.4, 0);
    playerBody.add(rightArmMesh);

    // Left Leg
    const leftLegMesh = new THREE.Mesh(leftLeg);
    leftLegMesh.position.set(-0.3, 1, 0);
    playerBody.add(leftLegMesh);

    // Right Leg
    const rightLegMesh = new THREE.Mesh(rightLeg);
    rightLegMesh.position.set(0.3, 1, 0);
    playerBody.add(rightLegMesh);

    // Every part is invisible but casts a shadow (assisted by Claude Code)
    playerBody.children.forEach((part) => {
        part.material = shadowOnlyMaterial;
        part.castShadow = true;
    });

    return playerBody;
}

/**
 * Moves the arms (left and right) at an angel while the player moves (based on delta time)
 */
export function moveArms() {
    const armSwingAngle = Math.sin(Date.now() * 0.00125) * 0.5; // Swing angle based on delta time
    // Rotate about x so arms swing forward/back (assisted by Claude Code)
    playerBody.children[2].rotation.x = armSwingAngle;
    playerBody.children[3].rotation.x = -armSwingAngle;
}

/**
 * Moves the legs (left and right) at an angel while the player moves (based on delta time)
 */
export function moveLegs() {
    const legSwingAngle = Math.sin(Date.now() * 0.00125) * 0.5; // Swing angle based on delta time
    playerBody.children[4].rotation.x = -legSwingAngle;
    playerBody.children[5].rotation.x = legSwingAngle;
}

const LIMB_RESET_SPEED = 8; // How quickly limbs ease back to standing (higher = faster)

/**
 * Smoothly eases the arms and legs back to their standing angle while the player is not moving.
 * Each frame the limbs move a fraction of the way to 0, so they slow down as they settle.
 * (assisted by Claude Code)
 * @param {number} deltaTime Seconds since the last frame
 */
export function resetLimbs(deltaTime) {
    for (let i = 2; i <= 5; i++) {
        const limb = playerBody.children[i];
        limb.rotation.x = THREE.MathUtils.damp(limb.rotation.x, 0, LIMB_RESET_SPEED, deltaTime);
    }
}
