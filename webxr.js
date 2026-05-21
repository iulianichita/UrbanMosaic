import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

const CAMERA_X = 5;
const CAMERA_FLOOR_Y = 7.64;
const CAMERA_Z = 0.15;

function setupMouseLook(renderer, camera) 
{
    const canvas = renderer.domElement;
    let active = false;
    let lastX = 0, lastY = 0;
    let yaw = 0, pitch = 0;

    //click dreapta (mouse look activ)
    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;
        active = true;
        lastX = e.clientX;
        lastY = e.clientY;
        camera.rotation.order = 'YXZ';
        yaw   = camera.rotation.y;
        pitch = camera.rotation.x;
        renderer.userData.mouseLookActive = true;
    });

    //miscare mouse
    document.addEventListener('mousemove', (e) => {
        if (!active) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        yaw   -= dx * 0.003;
        pitch -= dy * 0.003;
        pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    });

    //eliberare click dreapta
    document.addEventListener('mouseup', (e) => {
        if (e.button !== 2) return;
        active = false;
        renderer.userData.mouseLookActive = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // scroll/ zoom, functioneaza cat timp mouse look e activ
    const dir = new THREE.Vector3();
    canvas.addEventListener('wheel', (e) => {
        if (!active) return;
        e.preventDefault();
        camera.getWorldDirection(dir);
        camera.position.addScaledVector(dir, -e.deltaY * 0.01);
    }, { passive: false });
}

export function setupWebXR(renderer, camera, scene, animateLoop) 
{
    if (!renderer.userData) renderer.userData = {};

    renderer.userData.mouseLookActive = false;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');

    const hint = document.createElement('div');
    hint.style.cssText = `
        position: fixed;
        bottom: 70px;
        left: 20px;
        background: rgba(0, 0, 0, 0.1);
        border: 1px solid #fff;
        border-radius: 4px;
        color: #fff;
        font: normal 12px/1.8 sans-serif;
        padding: 12px 16px;
        width: 180px;
        pointer-events: none;
        user-select: none;
        letter-spacing: 0.03em;
    `;
    hint.innerHTML = 'Click stânga:<br>intră / ieși din cameră<br><br>Click dreapta + drag:<br>rotește<br><br><span style="opacity:0.65;font-size:11px">Click dreapta + scroll:<br>apropie / depărtează</span>';
    document.body.appendChild(hint);

    const vrButton = VRButton.createButton(renderer);
    vrButton.style.left = '20px';
    vrButton.style.transform = 'none';
    document.body.appendChild(vrButton);

    setupMouseLook(renderer, camera);

    let pozitieOriginalaSalvata = null;
    let rotatieOriginalaGSalvata = null;

    renderer.xr.addEventListener('sessionstart', () => 
    {
        pozitieOriginalaSalvata = camera.position.clone();
        rotatieOriginalaGSalvata = camera.rotation.clone();
        camera.position.set(CAMERA_X, CAMERA_FLOOR_Y, CAMERA_Z);
        camera.rotation.set(0, 0, 0);
    });

    renderer.xr.addEventListener('sessionend', () => {
        if (pozitieOriginalaSalvata) camera.position.copy(pozitieOriginalaSalvata);
        if (rotatieOriginalaGSalvata) camera.rotation.copy(rotatieOriginalaGSalvata);
    });

    renderer.setAnimationLoop(animateLoop);
}
