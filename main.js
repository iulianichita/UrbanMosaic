import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05011F);

let timpRandareAnterior = performance.now();
let timpTotalAnimatie = 0;
let starsLayerNear = null;
let starsLayerFar = null;
let starsNearMaterial = null;
let starsFarMaterial = null;

const copaciCuVant = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();


let geamInteractivMesh = null;
let geamInteractivRamaMesh = null;
let geamInteractivPervazMesh = null;
const geamuriInteractiveMeshes = [];
const geamuriInteractiveRame = [];
const geamuriInteractivePervaze = [];
const apartamente = []; 
let apartamentCurent = null;
let geamFocusMesh = null;
let cameraAplica = null;
let becTavanMesh = null;
let luminaCamera = null;
let cameraInModFocus = false;

const cameraLookAtCurent = new THREE.Vector3(0, 5.5, 0);
const cameraTargetPosition = new THREE.Vector3(0, 5.2, 19);
const cameraTargetLookAt = new THREE.Vector3(0, 5.5, 0);
const cameraDefaultPosition = new THREE.Vector3(0, 5.2, 19);
const cameraDefaultLookAt = new THREE.Vector3(0, 5.5, 0);
const cameraDefaultFov = 75;
let cameraTargetFov = cameraDefaultFov;

// websocket pentru audio 
let audioSocket = null;
let muzicaCameraPornita = false;


const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // converteste formatul final in srgb
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.appendChild(renderer.domElement);

function initAudioSocket() {
    audioSocket = new WebSocket('ws://localhost:8080');

    audioSocket.addEventListener('open', () => {
        console.log('Conectat la serverul audio');
        audioSocket.send('START_BACKGROUND');
    });

    audioSocket.addEventListener('error', error => {
        console.error('Eroare WebSocket audio:', error);
    });
}

function pornesteMuzicaCamera() {
    if (muzicaCameraPornita) return;
    muzicaCameraPornita = true;

    if (audioSocket && audioSocket.readyState === WebSocket.OPEN) {
        audioSocket.send('ENTER_ROOM');
    }
}

function opresteMuzicaCamera() {
    if (!muzicaCameraPornita) return;
    muzicaCameraPornita = false;

    if (audioSocket && audioSocket.readyState === WebSocket.OPEN) {
        audioSocket.send('EXIT_ROOM');
    }
}

initAudioSocket();


function creeazaDomCerNoapte() {
    const skyGeometry = new THREE.SphereGeometry(520, 64, 64);
    const skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            topColor: { value: new THREE.Color(0x020511) },
            middleColor: { value: new THREE.Color(0x07102b) },
            horizonColor: { value: new THREE.Color(0x1f2f52) },
            bottomColor: { value: new THREE.Color(0x0d1328) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 middleColor;
            uniform vec3 horizonColor;
            uniform vec3 bottomColor;

            varying vec3 vWorldPosition;

            void main() {
                vec3 direction = normalize(vWorldPosition);
                float h = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);

                vec3 skyBand = mix(bottomColor, horizonColor, smoothstep(0.0, 0.35, h));
                skyBand = mix(skyBand, middleColor, smoothstep(0.25, 0.7, h));
                skyBand = mix(skyBand, topColor, smoothstep(0.65, 1.0, h));

                gl_FragColor = vec4(skyBand, 1.0);
            }
        `
    });

    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyDome);
}

function creeazaStratStele(numarStele, razaMinima, razaMaxima, dimensiune, opacitate) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const culori = [];

    for (let i = 0; i < numarStele; i++) {
        const raza = razaMinima + Math.random() * (razaMaxima - razaMinima);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        const x = raza * Math.sin(phi) * Math.cos(theta);
        const y = Math.abs(raza * Math.sin(phi) * Math.sin(theta));
        const z = raza * Math.cos(phi);

        vertices.push(x, y - 8, z);

        const stralucire = 0.65 + Math.random() * 0.35;
        culori.push(stralucire, stralucire, stralucire + 0.05);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(culori, 3));

    const material = new THREE.PointsMaterial({
        size: dimensiune,
        sizeAttenuation: true,
        fog: false,
        transparent: true,
        opacity: opacitate,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    return {
        stele: new THREE.Points(geometry, material),
        material
    };
}

function creeazaTexturaLuna(rendererRef) {
    const dim = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(dim * 0.47, dim * 0.46, dim * 0.08, dim * 0.5, dim * 0.5, dim * 0.82);
    gradient.addColorStop(0, '#f2f0e8');
    gradient.addColorStop(0.6, '#dbd7ca');
    gradient.addColorStop(1, '#c2bcad');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dim, dim);

    // pete
    for (let i = 0; i < 18; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const r = 55 + Math.random() * 190;
        const pata = ctx.createRadialGradient(x, y, 0, x, y, r);
        pata.addColorStop(0, 'rgba(125, 123, 116, 0.26)');
        pata.addColorStop(1, 'rgba(125, 123, 116, 0)');
        ctx.fillStyle = pata;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // cratere
    for (let i = 0; i < 95; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const r = 6 + Math.random() * 28;

        const crater = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
        crater.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        crater.addColorStop(0.55, 'rgba(185, 181, 170, 0.26)');
        crater.addColorStop(1, 'rgba(90, 87, 82, 0.3)');
        ctx.fillStyle = crater;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
    }

    // aspect prafos
    for (let i = 0; i < 50000; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const v = 170 + Math.random() * 70;
        ctx.fillStyle = `rgba(${v}, ${v}, ${v - 8}, 0.05)`;
        ctx.fillRect(x, y, 1, 1);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const moonMask = ctx.createRadialGradient(dim * 0.5, dim * 0.5, dim * 0.45, dim * 0.5, dim * 0.5, dim * 0.5);
    moonMask.addColorStop(0, 'rgba(255, 255, 255, 1)');
    moonMask.addColorStop(0.96, 'rgba(255, 255, 255, 1)');
    moonMask.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = moonMask;
    ctx.fillRect(0, 0, dim, dim);
    ctx.restore();

    const colorTexture = new THREE.CanvasTexture(canvas);
    colorTexture.colorSpace = THREE.SRGBColorSpace; // calculatoarele proceseaza culorile intr-un mod (linear), dar ecranele le afiseaza in alt mod (sRGB)
    colorTexture.anisotropy = rendererRef.capabilities.getMaxAnisotropy(); // pastreaza textura clara
    colorTexture.needsUpdate = true;

    return { colorTexture };
}

function creeazaTexturaHaloLuna() {
    const dim = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');

    const halo = ctx.createRadialGradient(dim * 0.5, dim * 0.5, dim * 0.12, dim * 0.5, dim * 0.5, dim * 0.5);
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    halo.addColorStop(0.35, 'rgba(217, 229, 255, 0.12)');
    halo.addColorStop(0.68, 'rgba(217, 229, 255, 0.045)');
    halo.addColorStop(1, 'rgba(217, 229, 255, 0)');

    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, dim, dim);

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.needsUpdate = true;

    return textura;
}

function creeazaLuna() {
    const grupLuna = new THREE.Group();

    const lunaTexturi = creeazaTexturaLuna(renderer);

    const lunaMat = new THREE.SpriteMaterial({
        color: 0xffffff,
        map: lunaTexturi.colorTexture,
        transparent: true,
        depthWrite: false
    });
    const luna = new THREE.Sprite(lunaMat);
    luna.scale.set(10, 10, 1);
    grupLuna.add(luna);

    const haloMat = new THREE.SpriteMaterial({
        color: 0xd9e5ff,
        map: creeazaTexturaHaloLuna(),
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(16, 16, 1);
    grupLuna.add(halo);

    grupLuna.position.set(100, 60, -90);
    scene.add(grupLuna);

    const luminaLuna = new THREE.PointLight(0xb3c8ff, 0.8, 260, 2);
    luminaLuna.position.copy(grupLuna.position);
    scene.add(luminaLuna);
}

function creeazaCerNoapteRealist() {
    creeazaDomCerNoapte();

    const stratAproape = creeazaStratStele(3800, 260, 420, 1.25, 0.75);
    starsLayerNear = stratAproape.stele;
    starsNearMaterial = stratAproape.material;
    scene.add(starsLayerNear);

    const stratDepartat = creeazaStratStele(2400, 380, 510, 0.95, 0.5);
    starsLayerFar = stratDepartat.stele;
    starsFarMaterial = stratDepartat.material;
    scene.add(starsLayerFar);

    creeazaLuna();
}

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.03, 1000);
camera.position.set(0, 5.2, 19);
camera.lookAt(0, 5.5, 0);


creeazaCerNoapteRealist();


// LUMINI
// adaugare lumina in scena
const ambientLight = new THREE.AmbientLight(0x2a3457, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xd0deff, 1.35);
directionalLight.position.set(-20, 30, 20);
scene.add(directionalLight);

const backLight = new THREE.PointLight(0x07102b, 100, 50);
backLight.position.set(0, 10, -20);
scene.add(backLight);


// MATERIALE
function creeazaTexturaFatadaBloc() {
    const dim = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');

    const culoareCaramida = [
        '#9c5a3c', '#a8623f', '#b06040', '#7d4530', '#8a4e35'
    ];

    // dimensiuni caramida
    const cH = 52;   // inaltime caramida
    const cW = 112;  // latime caramida
    const rost = 10; // grosime spatii

    const randuri = Math.ceil(dim / (cH + rost)) + 1;
    const coloane = Math.ceil(dim / (cW + rost)) + 2;

    ctx.fillStyle = '#4a3728';
    ctx.fillRect(0, 0, dim, dim);

    // textura intre caramizi
    for (let i = 0; i < 30000; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const v = 55 + Math.random() * 30;
        ctx.fillStyle = `rgba(${v}, ${v - 8}, ${v - 14}, 0.4)`;
        ctx.fillRect(x, y, 1, 1);
    }

    // caramizi
    for (let r = 0; r < randuri; r++) {
        const decalaj = (r % 2 === 0) ? 0 : (cW + rost) / 2;
        const y = r * (cH + rost);

        for (let c = -1; c < coloane; c++) {
            const x = c * (cW + rost) + decalaj;

            const idxCuloare = Math.floor(Math.random() * culoareCaramida.length);
            const culBaza = culoareCaramida[idxCuloare];

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, cW, cH);
            ctx.clip();

            // corp caramida
            ctx.fillStyle = culBaza;
            ctx.fillRect(x, y, cW, cH);

            // gradient intern
            const grd = ctx.createLinearGradient(x, y, x, y + cH);
            grd.addColorStop(0, `rgba(255,255,255,${0.06 + Math.random() * 0.05})`);
            grd.addColorStop(0.5, 'rgba(0,0,0,0)');
            grd.addColorStop(1, `rgba(0,0,0,${0.08 + Math.random() * 0.06})`);
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, cW, cH);

            // caramizi nu sunt uniform colorate
            const grdLat = ctx.createLinearGradient(x, y, x + cW, y);
            grdLat.addColorStop(0, `rgba(0,0,0,${Math.random() * 0.08})`);
            grdLat.addColorStop(0.5, 'rgba(0,0,0,0)');
            grdLat.addColorStop(1, `rgba(0,0,0,${Math.random() * 0.08})`);
            ctx.fillStyle = grdLat;
            ctx.fillRect(x, y, cW, cH);

            // dungi orizontale fine
            for (let s = 0; s < 4; s++) {
                const sy = y + Math.random() * cH;
                ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
                ctx.lineWidth = Math.random() * 0.8;
                ctx.beginPath();
                ctx.moveTo(x, sy);
                ctx.lineTo(x + cW, sy);
                ctx.stroke();
            }

            // pete de uzura
            if (Math.random() < 0.35) {
                const px = x + Math.random() * cW;
                const py = y + Math.random() * cH;
                const pr = 8 + Math.random() * 20;
                const pata = ctx.createRadialGradient(px, py, 0, px, py, pr);
                const dark = Math.random() < 0.5;
                pata.addColorStop(0, dark
                    ? 'rgba(0,0,0,0.12)'
                    : 'rgba(255,220,180,0.15)');
                pata.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = pata;
                ctx.fillRect(x, y, cW, cH);
            }

            // highlight pe muchia de sus
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(x, y, cW, 2);

            // umbra pe muchia de jos
            ctx.fillStyle = 'rgba(0,0,0,0.13)';
            ctx.fillRect(x, y + cH - 2, cW, 2);

            ctx.restore();
        }
    }

    // textura fina pe toata suprafata
    for (let i = 0; i < 80000; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const v = 80 + Math.random() * 120;
        ctx.fillStyle = `rgba(${v}, ${v - 10}, ${v - 18}, 0.025)`;
        ctx.fillRect(x, y, 1, 1);
    }

    // pete albe
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * dim;
        const h = 30 + Math.random() * 120;
        const y = Math.random() * (dim - h);
        ctx.fillStyle = `rgba(210, 200, 185, ${0.03 + Math.random() * 0.05})`;
        ctx.fillRect(x, y, 1.2 + Math.random(), h);
    }

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(1.6, 1.25);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 8;
    return textura;
}

const texturaFatadaBloc = creeazaTexturaFatadaBloc();

const matRosuCaramiziu = new THREE.MeshStandardMaterial({
    color: 0xb16e63,
    map: texturaFatadaBloc,
    bumpMap: texturaFatadaBloc,
    bumpScale: 0.02,
    roughness: 0.82,
    metalness: 0.02,
    emissive: 0x1a1210,
    emissiveIntensity: 0.06
});
const matOranjDeschis = new THREE.MeshStandardMaterial({
    color: 0xe5b38e,
    map: texturaFatadaBloc,
    bumpMap: texturaFatadaBloc,
    bumpScale: 0.018,
    roughness: 0.8,
    metalness: 0.02,
    emissive: 0x21170f,
    emissiveIntensity: 0.06
});
const matAlbastruInchis = new THREE.MeshLambertMaterial({ color: 0x2e4053 });
const matAlbRama = new THREE.MeshLambertMaterial({ color: 0xffffff });
const matGriScurt = new THREE.MeshLambertMaterial({ color: 0x566573 }); // pt scari
const matAsfalt = new THREE.MeshLambertMaterial({ color: 0x2f343c });
const matMarcaj = new THREE.MeshLambertMaterial({ color: 0xf6f1d1 });
const matLemnBanca = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
const matMetalUrban = new THREE.MeshLambertMaterial({ color: 0x333333 });
const matPereteInteriorCamera = new THREE.MeshStandardMaterial({
    color: 0xe8e2d7,
    roughness: 0.92,
    metalness: 0.02
});
const matPodeaInteriorCamera = new THREE.MeshStandardMaterial({
    color: 0x8e6f4d,
    roughness: 0.72,
    metalness: 0.05,
    polygonOffset: true, // pt a nu exista suprapuneri intre obiectele din scena
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
});
const matMobilierInterior = new THREE.MeshStandardMaterial({
    color: 0x5f4935,
    roughness: 0.75,
    metalness: 0.04
});

function creeazaTexturaTrotuarRealist() {
    const dim = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');

    // beton rece
    ctx.fillStyle = '#8f97a0';
    ctx.fillRect(0, 0, dim, dim);

    const marimeDala = 140;
    const rost = 3;

    for (let y = 0; y < dim; y += marimeDala) {
        for (let x = 0; x < dim; x += marimeDala) {
            const variatie = Math.floor(132 + Math.random() * 18);
            ctx.fillStyle = `rgb(${variatie}, ${variatie + 2}, ${variatie + 5})`;
            ctx.fillRect(x + rost, y + rost, marimeDala - rost, marimeDala - rost);
        }
    }

    // spatii intre dale
    ctx.fillStyle = 'rgba(88, 93, 101, 0.7)';
    for (let x = 0; x < dim; x += marimeDala) {
        ctx.fillRect(x, 0, rost, dim);
    }
    for (let y = 0; y < dim; y += marimeDala) {
        ctx.fillRect(0, y, dim, rost);
    }

    // textura
    for (let i = 0; i < 65000; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const gri = 110 + Math.random() * 70;
        ctx.fillStyle = `rgba(${gri}, ${gri}, ${gri}, 0.055)`;
        ctx.fillRect(x, y, 1, 1);
    }

    // urme de uzura
    for (let i = 0; i < 75; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const radius = 6 + Math.random() * 22;
        const pata = ctx.createRadialGradient(x, y, 0, x, y, radius);
        pata.addColorStop(0, 'rgba(58, 62, 69, 0.08)');
        pata.addColorStop(1, 'rgba(60, 64, 70, 0)');
        ctx.fillStyle = pata;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(1.35, 0.9);
    textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
}

function creeazaTexturaBetonBordura() {
    const dim = 512;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');

    // fundal baza
    ctx.fillStyle = '#9da2a8';
    ctx.fillRect(0, 0, dim, dim);

    for (let i = 0; i < 40000; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const gri = 130 + Math.random() * 50;
        ctx.fillStyle = `rgba(${gri}, ${gri}, ${gri}, 0.15)`;
        ctx.fillRect(x, y, 1, 1);
    }

    // pete de uzura
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * dim;
        const y = Math.random() * dim;
        const radius = 5 + Math.random() * 25;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(80, 80, 80, 0.1)');
        gradient.addColorStop(1, 'rgba(150, 150, 150, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // efect de drip
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * dim;
        const h = 5 + Math.random() * 15;
        ctx.fillStyle = 'rgba(60, 60, 60, 0.05)';
        ctx.fillRect(x, 0, 1.5, h);
    }

    // margine superioara
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, dim, 15);

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    // repetam textura pe lungime pentru a nu parea intinsa
    textura.repeat.set(1, 1); 
    
    return textura;
}   

const texturaBordura = creeazaTexturaBetonBordura();

const matBorduraRealista = new THREE.MeshStandardMaterial({
    color: 0x999999, 
    map: texturaBordura,
    bumpMap: texturaBordura,
    bumpScale: 0.015, 
    roughness: 0.9, 
    metalness: 0.0,
});

const texturaTrotuarRealist = creeazaTexturaTrotuarRealist();

const matTrotuarRealist = new THREE.MeshStandardMaterial({
    color: 0xa4acb4,
    map: texturaTrotuarRealist,
    bumpMap: texturaTrotuarRealist,
    bumpScale: 0.012,
    roughness: 0.92,
    metalness: 0.02
});

const matPamantAlveola = new THREE.MeshStandardMaterial({ 
    color: 0x3d2b1f, // maro inchis
    roughness: 1.0, 
    metalness: 0.0 
});

const matBorduraAlveola = new THREE.MeshLambertMaterial({ 
    color: 0x888888
});



// FORME
const geoPereteRosu = new THREE.BoxGeometry(4, 3, 0.2); // perete exterior
const geoPereteOranj = new THREE.BoxGeometry(6, 3, 0.2);
const geoPlanseu = new THREE.BoxGeometry(14, 0.2, 5); // podea/tavan (latime x grosime x adancime)
const geoPereteInterior = new THREE.BoxGeometry(0.1, 3, 5); // perete despartitor interior



function creeazaFereastra() {
    const grupFereastra = new THREE.Group();

    // rama alba
    const ramaGeom = new THREE.BoxGeometry(1.2, 1.8, 0.1);
    const ramaMesh = new THREE.Mesh(ramaGeom, matAlbRama);
    grupFereastra.add(ramaMesh);
    grupFereastra.userData.rama = ramaMesh;

    // sticla
    const sticlaGeom = new THREE.BoxGeometry(1.0, 1.6, 0.05);
    const sticlaMesh = new THREE.Mesh(sticlaGeom, matAlbastruInchis);
    sticlaMesh.position.z = 0.03; // putin in fata ramelor
    grupFereastra.add(sticlaMesh);
    grupFereastra.userData.sticla = sticlaMesh;

    // pervaz
    const pervazGeom = new THREE.BoxGeometry(1.4, 0.1, 0.2);
    const glafMesh = new THREE.Mesh(pervazGeom, matAlbRama);
    glafMesh.position.y = -0.95;
    grupFereastra.add(glafMesh);
    grupFereastra.userData.pervaz = glafMesh;

    return grupFereastra;
}

function creeazaUsaIntrare() {
    const grupUsa = new THREE.Group();

    const toc = new THREE.Mesh(
        new THREE.BoxGeometry(2.9, 2.45, 0.16),
        matAlbRama
    );
    toc.position.z = -0.02;
    grupUsa.add(toc);

    const panouUsa = new THREE.Mesh(
        new THREE.BoxGeometry(2.55, 2.25, 0.11),
        new THREE.MeshLambertMaterial({ color: 0x2f3f52 })
    );
    grupUsa.add(panouUsa);

    const geamSuperior = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.58, 0.04),
        new THREE.MeshBasicMaterial({
            color: 0x9ec3e7,
            transparent: true,
            opacity: 0.68
        })
    );
    geamSuperior.position.set(0, 0.55, 0.07);
    grupUsa.add(geamSuperior);

    const separatorUsa = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 2.1, 0.03),
        matAlbRama
    );
    separatorUsa.position.z = 0.08;
    grupUsa.add(separatorUsa);

    const yClanta = -0.15;
    const clantaStanga = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0xc3c8cf })
    );
    clantaStanga.position.set(-0.42, yClanta, 0.1);
    grupUsa.add(clantaStanga);

    const clantaDreapta = clantaStanga.clone();
    clantaDreapta.position.x = 0.42;
    grupUsa.add(clantaDreapta);

    const treapta = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.14, 0.55),
        matGriScurt
    );
    treapta.position.set(0, -1.2, 0.25);
    grupUsa.add(treapta);

    return grupUsa;
}

function creeazaCanapea2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaCanapea2 = textureLoader.load('/textures/materialAlbastru.jpg');
    texturaCanapea2.flipY = false;

    loader.load('/models/canapea2.glb', (gltf) => {

        const canapea2 = gltf.scene;

        canapea2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaCanapea2;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(canapea2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //canapea.rotation.x = -Math.PI / 2;
        canapea2.position.sub(center);
        canapea2.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(canapea2);

    });
}

function creeazaScaun3(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaScaun3 = textureLoader.load('/textures/materialVerdeD.jpg');
    texturaScaun3.flipY = false;

    loader.load('/models/scaun3.glb', (gltf) => {

        const scaun3 = gltf.scene;

        scaun3.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaScaun3;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(scaun3);
        const center = new THREE.Vector3();
        box.getCenter(center);

        scaun3.position.sub(center);
        scaun3.scale.set(0.3, 0.3, 0.3);

        if (onLoaded) onLoaded(scaun3);

    });
}

function creeazaMasa1(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaMasa1 = textureLoader.load('/textures/lemnDeschis.jpg');
    texturaMasa1.flipY = false;

    loader.load('/models/masa1.glb', (gltf) => {

        const masa1 = gltf.scene;

        masa1.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaMasa1;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(masa1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        masa1.position.sub(center);
        masa1.scale.set(0.13, 0.13, 0.13);

        if (onLoaded) onLoaded(masa1);

    });
}

function creeazaCovor1(onLoaded) {
    loader.load('/models/covor1.glb', (gltf) => {

        const covor1 = gltf.scene;

        const box = new THREE.Box3().setFromObject(covor1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        covor1.rotation.x = -Math.PI / 2;
        covor1.position.sub(center);
        covor1.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(covor1);

    });
}

function creeazaBirou1(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaBirou1 = textureLoader.load('/textures/lemnRosu.jpg');
    texturaBirou1.flipY = false;

    loader.load('/models/birou1.glb', (gltf) => {

        const birou1 = gltf.scene;

        birou1.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaBirou1;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(birou1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        birou1.position.sub(center);
        birou1.scale.set(0.7, 0.7, 0.7);

        if (onLoaded) onLoaded(birou1);

    });
}

function creeazaBirou2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaBirou2 = textureLoader.load('/textures/lemnInchis.jpg');
    texturaBirou2.flipY = false;

    loader.load('/models/birou2.glb', (gltf) => {

        const birou2 = gltf.scene;

        birou2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaBirou2;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(birou2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        birou2.position.sub(center);
        birou2.scale.set(0.6, 0.6, 0.6);

        if (onLoaded) onLoaded(birou2);

    });
}

function creeazaBirou4(onLoaded) {
    loader.load('/models/birou4.glb', (gltf) => {

        const birou4 = gltf.scene;

        const box = new THREE.Box3().setFromObject(birou4);
        const center = new THREE.Vector3();
        box.getCenter(center);

        birou4.rotation.x = -Math.PI / 2;
        birou4.position.sub(center);
        birou4.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(birou4);

    });
}

function creeazaBiblioteca1(onLoaded) {
    loader.load('/models/biblioteca1.glb', (gltf) => {

        const biblioteca1 = gltf.scene;

        const box = new THREE.Box3().setFromObject(biblioteca1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        biblioteca1.position.sub(center);
        biblioteca1.scale.set(30.0, 30.0, 30.0);

        if (onLoaded) onLoaded(biblioteca1);

    });
}

function creeazaBiblioteca2(onLoaded) {
    loader.load('/models/biblioteca2.glb', (gltf) => {

        const biblioteca2 = gltf.scene;

        const box = new THREE.Box3().setFromObject(biblioteca2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        biblioteca2.position.sub(center);
        biblioteca2.scale.set(1.4, 1.4, 1.4);

        if (onLoaded) onLoaded(biblioteca2);

    });
}

function creeazaBiblioteca3(onLoaded) {
    loader.load('/models/biblioteca3.glb', (gltf) => {

        const biblioteca3 = gltf.scene;

        const box = new THREE.Box3().setFromObject(biblioteca3);
        const center = new THREE.Vector3();
        box.getCenter(center);

        biblioteca3.position.sub(center);
        biblioteca3.scale.set(0.9, 0.9, 0.9);

        if (onLoaded) onLoaded(biblioteca3);

    });
}

function creeazaCalorifer(onLoaded) {
    loader.load('/models/calorifer.glb', (gltf) => {

        const calorifer = gltf.scene;

        const box = new THREE.Box3().setFromObject(calorifer);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //calorifer.rotation.x = -Math.PI / 2;
        calorifer.position.sub(center);
        calorifer.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(calorifer);

    });
}

function creeazaCarte(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaCarte = textureLoader.load('/textures/materialVerdeI.jpg');
    texturaCarte.flipY = false;

    loader.load('/models/carte1.glb', (gltf) => {

        const carte = gltf.scene;

        carte.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaCarte;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(carte);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //carte.rotation.x = -Math.PI / 2;
        carte.position.sub(center);
        carte.scale.set(0.1, 0.1, 0.1);

        if (onLoaded) onLoaded(carte);

    });
}

function creeazaCeas1(onLoaded) {
    loader.load('/models/ceas1.glb', (gltf) => {

        const ceas1 = gltf.scene;

        const box = new THREE.Box3().setFromObject(ceas1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //ceas1.rotation.x = -Math.PI / 2;
        ceas1.position.sub(center);
        ceas1.scale.set(0.001, 0.001, 0.001);

        if (onLoaded) onLoaded(ceas1);

    });
}

function creeazaCovor2(onLoaded) {
    loader.load('/models/covor2.glb', (gltf) => {

        const covor2 = gltf.scene;

        const box = new THREE.Box3().setFromObject(covor2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        covor2.rotation.x = -Math.PI / 2;
        covor2.position.sub(center);
        covor2.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(covor2);

    });
}

function creeazaDulap1(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaDulap1 = textureLoader.load('/textures/lemnVerde.jpg');
    texturaDulap1.flipY = false;

    loader.load('/models/dulap1.glb', (gltf) => {

        const dulap1 = gltf.scene;

        dulap1.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaDulap1;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(dulap1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //dulap1.rotation.x = -Math.PI / 2;
        dulap1.position.sub(center);
        dulap1.scale.set(0.7, 0.7, 0.7);

        if (onLoaded) onLoaded(dulap1);

    });
}

function creeazaDulap2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaDulap2 = textureLoader.load('/textures/lemnDeschis.jpg');
    texturaDulap2.flipY = false;

    loader.load('/models/dulap2.glb', (gltf) => {

        const dulap2 = gltf.scene;

        dulap2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaDulap2;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(dulap2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //dulap2.rotation.x = -Math.PI / 2;
        dulap2.position.sub(center);
        dulap2.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(dulap2);

    });
}

function creeazaLampa1(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaLampa1 = textureLoader.load('/textures/metalAuriu.jpg');
    texturaLampa1.flipY = false;

    loader.load('/models/lampa1.glb', (gltf) => {

        const lampa1 = gltf.scene;

        lampa1.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaLampa1;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(lampa1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //lampa1.rotation.x = -Math.PI / 2;
        lampa1.position.sub(center);
        lampa1.scale.set(1.3, 1.3, 1.3);

        if (onLoaded) onLoaded(lampa1);

    });
}

function creeazaLampa2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaLampa2 = textureLoader.load('/textures/metalAuriu.jpg');
    texturaLampa2.flipY = false;

    loader.load('/models/lampa2.glb', (gltf) => {

        const lampa2 = gltf.scene;

        lampa2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaLampa2;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(lampa2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //lampa2.rotation.x = -Math.PI / 2;
        lampa2.position.sub(center);
        lampa2.scale.set(1.0, 1.0, 1.0);

        if (onLoaded) onLoaded(lampa2);

    });
}

function creeazaMasa3(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaMasa3 = textureLoader.load('/textures/lemnInchis.jpg');
    texturaMasa3.flipY = false;

    loader.load('/models/masa3.glb', (gltf) => {

        const masa3 = gltf.scene;

        masa3.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaMasa3;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(masa3);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //masa3.rotation.x = -Math.PI / 2;
        masa3.position.sub(center);
        masa3.scale.set(0.5, 0.5, 0.5);

        if (onLoaded) onLoaded(masa3);

    });
}

function creeazaMasa4(onLoaded) {
    loader.load('/models/masa4.glb', (gltf) => {

        const masa4 = gltf.scene;

        const box = new THREE.Box3().setFromObject(masa4);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //masa4.rotation.x = -Math.PI / 2;
        masa4.position.sub(center);
        masa4.scale.set(0.2, 0.2, 0.2);

        if (onLoaded) onLoaded(masa4);

    });
}

function creeazaNoptiera2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaNoptiera2 = textureLoader.load('/textures/lemnInchis.jpg');
    texturaNoptiera2.flipY = false;

    loader.load('/models/noptiera2.glb', (gltf) => {

        const noptiera2 = gltf.scene;

        noptiera2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaNoptiera2;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(noptiera2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //noptiera2.rotation.x = -Math.PI / 2;
        noptiera2.position.sub(center);
        noptiera2.scale.set(0.2, 0.2, 0.2);

        if (onLoaded) onLoaded(noptiera2);

    });
}

function creeazaPat1(onLoaded) {
    loader.load('/models/pat1.glb', (gltf) => {

        const pat1 = gltf.scene;

        const box = new THREE.Box3().setFromObject(pat1);
        const center = new THREE.Vector3();
        box.getCenter(center);

        pat1.rotation.x = -Math.PI / 2;
        pat1.position.sub(center);
        pat1.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(pat1);

    });
}

function creeazaPat2(onLoaded) {
    loader.load('/models/pat2.glb', (gltf) => {

        const pat2 = gltf.scene;

        const box = new THREE.Box3().setFromObject(pat2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        pat2.rotation.x = -Math.PI / 2;
        pat2.position.sub(center);
        pat2.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(pat2);

    });
}

function creeazaPat4(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaPat4 = textureLoader.load('/textures/materialVerdeD.jpg');
    texturaPat4.flipY = false;

    loader.load('/models/pat4.glb', (gltf) => {

        const pat4 = gltf.scene;

        pat4.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaPat4;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(pat4);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //pat4.rotation.x = -Math.PI / 2;
        pat4.position.sub(center);
        pat4.scale.set(0.8, 0.8, 0.8);

        if (onLoaded) onLoaded(pat4);

    });
}

function creeazaPat5(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaPat5 = textureLoader.load('/textures/lemnInchis.jpg');
    texturaPat5.flipY = false;

    loader.load('/models/pat5.glb', (gltf) => {

        const pat5 = gltf.scene;

        pat5.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaPat5;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(pat5);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //pat5.rotation.x = -Math.PI / 2;
        pat5.rotation.y = -Math.PI / 2 ;
        pat5.position.sub(center);
        pat5.scale.set(0.15, 0.15, 0.15);

        if (onLoaded) onLoaded(pat5);

    });
}

function creeazaScaun2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaScaun2 = textureLoader.load('/textures/materialAlbastru.jpg');
    texturaScaun2.flipY = false;

    loader.load('/models/scaun2.glb', (gltf) => {

        const scaun2 = gltf.scene;
        
        scaun2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaScaun2;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(scaun2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //scaun2.rotation.x = -Math.PI / 2;
        scaun2.position.sub(center);
        scaun2.scale.set(0.015, 0.015, 0.015);

        if (onLoaded) onLoaded(scaun2);

    });
}

function creeazaScaun4(onLoaded) {
    loader.load('/models/scaun4.glb', (gltf) => {

        const scaun4 = gltf.scene;

        const box = new THREE.Box3().setFromObject(scaun4);
        const center = new THREE.Vector3();
        box.getCenter(center);

        scaun4.rotation.x = -Math.PI / 2;
        scaun4.position.sub(center);
        scaun4.scale.set(0.01, 0.01, 0.01);

        if (onLoaded) onLoaded(scaun4);

    });
}

function creeazaVanity(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaVanity = textureLoader.load('/textures/lemnRosu.jpg');
    texturaVanity.flipY = false;

    loader.load('/models/vanity.glb', (gltf) => {

        const vanity = gltf.scene;

        vanity.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaVanity;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(vanity);
        const center = new THREE.Vector3();
        box.getCenter(center);

        //vanity.rotation.x = -Math.PI / 2;
        vanity.position.sub(center);
        vanity.scale.set(0.3, 0.3, 0.3);

        if (onLoaded) onLoaded(vanity);

    });
}

function creeazaUsa2(onLoaded) {
    const textureLoader = new THREE.TextureLoader();
    const texturaUsa = textureLoader.load('/textures/lemnDeschis.jpg');

    loader.load('/models/usa2.glb', (gltf) => {
        const usa2 = gltf.scene;

        usa2.traverse((child) => {

            if (child.isMesh) {

                child.material.map = texturaUsa;
                child.material.needsUpdate = true;

                child.castShadow = true;
                child.receiveShadow = true;
            }

        });

        const box = new THREE.Box3().setFromObject(usa2);
        const center = new THREE.Vector3();
        box.getCenter(center);

        usa2.rotation.y = -Math.PI / 2;
        usa2.position.sub(center);
        usa2.scale.set(0.3, 0.3, 0.3);

        if (onLoaded) onLoaded(usa2);

    });
}

function creeazaPlantaMare() {
    const planta = new THREE.Group();

    const ghiveci = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.25, 0.7, 16),
        new THREE.MeshStandardMaterial({ color: 0x6b4f3a })
    );
    planta.add(ghiveci);

    const tulpina = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 1.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x2f5d2f })
    );
    tulpina.position.y = 0.8;
    planta.add(tulpina);

    for (let i = 0; i < 20; i++) {
        const frunza = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x2f7a3a })
        );

        frunza.position.set(
            Math.random() * 0.4 - 0.2,
            1.2 + Math.random() * 0.6,
            Math.random() * 0.4 - 0.2
        );
        frunza.scale.set(1, 0.4, 0.8);

        planta.add(frunza);
    }

    return planta;
}

function creeazaCameraVizibilaGeamDreaptaSus() {
    const grupCamera = new THREE.Group();
    const latime = 3.6;
    const inaltime = 2.7;
    const adancime = 4.6;
    const centruX = 5;
    const fataZ = 2.45;

    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    // podea putin ridicata pt a evita suprapuneri
    podea.position.set(centruX, -1.36, fataZ - adancime / 2);
    grupCamera.add(podea);

    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime, inaltime, 0.08),
        matPereteInteriorCamera
    );
    pereteSpate.position.set(centruX, -0.08, fataZ - adancime + 0.04);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, inaltime, adancime),
        matPereteInteriorCamera
    );
    pereteStanga.position.set(centruX - latime / 2 + 0.04, -0.08, fataZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, inaltime, adancime),
        matPereteInteriorCamera
    );
    pereteDreapta.position.set(centruX + latime / 2 - 0.04, -0.08, fataZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    const plintaSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime - 0.08, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plintaSpate.position.set(centruX, -1.34, fataZ - adancime + 0.08);
    grupCamera.add(plintaSpate);

    const covor = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.02, 1.5),
        new THREE.MeshLambertMaterial({ color: 0x4f5d6f })
    );
    covor.position.set(5, -1.39, -0.45);
    grupCamera.add(covor);

    //EXEMPLE POZITII 
    //pozitie general ok, patul la perete, canapeaua la fel, pozitii de genul
    //am scalat obiectele ok (zic eu) in fucntiile de creeaza

    // creeazaCanapea2((canapea2) => {
    //     canapea2.position.set(4.3, -1.2, -1.4);
    //     grupCamera.add(canapea2);
    // });

    // creeazaScaun3((scaun3) => {
    //     scaun3.position.set(4.3, -1.2, -1.0);
    //     grupCamera.add(scaun3);
    // });

    // creeazaMasa1((masa1) => {
    //     masa1.position.set(3.85, -1.5, -1.0);
    //     grupCamera.add(masa1);
    // });

    // creeazaCovor1((covor1) => {
    //     covor1.position.set(4.6, -1.3, -0.6);
    //     grupCamera.add(covor1);
    // });

    // creeazaBirou1((birou1) => {
    //     birou1.position.set(3.9, -1.2, -0.6);
    //     grupCamera.add(birou1);
    // });

    // creeazaBirou2((birou2) => {
    //     birou2.position.set(6.15, -1.2, -1.4);
    //     grupCamera.add(birou2);
    // });

    // creeazaBirou4((birou4) => {
    //     birou4.position.set(5.8, -1.3, -1.4);
    //     grupCamera.add(birou4);
    // });

    // creeazaBiblioteca1((biblioteca1) => {
    //     biblioteca1.position.set(4.8, -1.0, -1.4);
    //     grupCamera.add(biblioteca1);
    // });

    // creeazaBiblioteca2((biblioteca2) => {
    //     biblioteca2.position.set(5.8, -1.3, -1.4);
    //     grupCamera.add(biblioteca2);
    // });

    // creeazaBiblioteca3((biblioteca3) => {
    //     biblioteca3.position.set(5.8, -1.3, -1.4);
    //     grupCamera.add(biblioteca3);
    // });

    // creeazaCalorifer((calorifer) => {
    //     calorifer.position.set(4.2, -1.3, -1.7);
    //     grupCamera.add(calorifer);
    // });

    // creeazaCarte((carte) => {
    //     carte.position.set(5.2, -0.5, -1.2);
    //     grupCamera.add(carte);
    // });

    // creeazaCeas1((ceas1) => {
    //     ceas1.position.set(5.2, -0.5, -1.2);
    //     grupCamera.add(ceas1);
    // });

    // creeazaCovor2((covor2) => {
    //     covor2.position.set(5.2, -1.3, -0.6);
    //     grupCamera.add(covor2);
    // });

    // creeazaDulap1((dulap1) => {
    //     dulap1.position.set(4.2, -1.3, -1.7);
    //     grupCamera.add(dulap1);
    // });

    // creeazaDulap2((dulap2) => {
    //     dulap2.position.set(4.6, -1.3, -1.7);
    //     grupCamera.add(dulap2);
    // });

    // creeazaLampa1((lampa1) => {
    //     lampa1.position.set(5.2, -0.3, -1.2);
    //     grupCamera.add(lampa1);
    // });

    // creeazaLampa2((lampa2) => {
    //     lampa2.position.set(4.5, -0.9, -1.2);
    //     grupCamera.add(lampa2);
    // });

    // creeazaMasa3((masa3) => {
    //     masa3.position.set(4.5, -1.3, -1.2);
    //     grupCamera.add(masa3);
    // });

    // creeazaMasa4((masa4) => {
    //     masa4.position.set(4.5, -1.2, -1.2);
    //     grupCamera.add(masa4);
    // });

    // creeazaNoptiera2((noptiera2) => {
    //     noptiera2.position.set(4.5, -1.2, -1.2);
    //     grupCamera.add(noptiera2);
    // });

    // creeazaPat1((pat1) => {
    //     pat1.position.set(4.7, -0.8, -1.0);
    //     grupCamera.add(pat1);
    // });

    // creeazaPat2((pat2) => {
    //     pat2.position.set(5.9, -0.8, -1.0);
    //     grupCamera.add(pat2);
    // });

    // creeazaPat4((pat4) => {
    //     pat4.position.set(5.55, -1.2, 0.4);
    //     grupCamera.add(pat4);
    // });

    // creeazaPat5((pat5) => {
    //     pat5.position.set(5.1, -2.0, -1.3);
    //     grupCamera.add(pat5);
    // });

    // creeazaScaun2((scaun2) => {
    //     scaun2.position.set(5.1, -1.5, -1.3);
    //     grupCamera.add(scaun2);
    // });

    // creeazaScaun4((scaun4) => {
    //     scaun4.position.set(5.1, -1.3, -1.3);
    //     grupCamera.add(scaun4);
    // });

    // creeazaVanity((vanity) => {
    //     vanity.position.set(4.4, -0.5, -1.1);
    //     grupCamera.add(vanity);
    // });

    // creeazaUsa2((usa2) => {
    //     usa2.position.set(3.8, -1.2, -1.6);
    //     grupCamera.add(usa2);
    // });

    return grupCamera;
}

function creeazaCamera1() {
    const grupCamera = new THREE.Group();

    const latime = 2.3;
    const inaltime = 3;
    const adancime = 3;
    const frontZ = 2.45;
    const grosimePerete = 0.08;

    // podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    // pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0x524242}),
        matPereteInteriorCamera
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0x000000}),
        matPereteInteriorCamera
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0x000000}),
        matPereteInteriorCamera
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    // plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    // mobila
    creeazaBirou2((birou2) => {
        birou2.position.set(0.2, -1.2, frontZ - 2.2);
        birou2.rotation.y = 0;
        grupCamera.add(birou2);
    });

    creeazaScaun3((scaun3) => {
        scaun3.position.set(0, -1.25, frontZ - 1.7);
        scaun3.rotation.y = 4;
        grupCamera.add(scaun3);
    });

    creeazaCovor2((covor2) => {
        covor2.position.set(0, -1.3, 0.8);
        grupCamera.add(covor2);
    });

    creeazaLampa2((lampa2) => {
        lampa2.position.set(-0.3, -0.79, frontZ- 2.5);
        grupCamera.add(lampa2);
    });

    return grupCamera;
}

function creeazaCamera2() {
    const grupCamera = new THREE.Group();
    const latime = 2.2;
    const inaltime = 2.9;
    const adancime = 2.2;
    const fataZ = 2.45;
    const grosimePerete = 0.08;

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        new THREE.MeshLambertMaterial({ color: 0x45423E}),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, fataZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0xD9B280}),
        matPereteInteriorCamera
    );
    pereteSpate.position.set(0, -0.08, fataZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0xD9B280}),
        matPereteInteriorCamera
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, fataZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0xD9B280}),
        matPereteInteriorCamera
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, fataZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, fataZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaCanapea2((canapea2) => {
        canapea2.position.set(-0.05, -1.15, fataZ - 1.9);
        canapea2.rotation.y = 0;
        grupCamera.add(canapea2);
    });

    creeazaMasa1((masa1) => {
        masa1.position.set(-0.05, -1.7, fataZ - 0.8);
        masa1.rotation.y = Math.PI / 2;
        grupCamera.add(masa1);
    });

    creeazaCovor1((covor1) => {
        covor1.position.set(0, -1.3, fataZ - 1.2);
        grupCamera.add(covor1);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0, 0.5, fataZ - 1.5);
        grupCamera.add(ceas1);
    });

    return grupCamera;
}

function creeazaCamera3() {
    const grupCamera = new THREE.Group();
    const latime = 2.2;
    const inaltime = 2.9;
    const adancime = 2.2;
    const fataZ = 2.45;
    const grosimePerete = 0.08;

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, fataZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0xb88d8d}),
        matPereteInteriorCamera
    );
    pereteSpate.position.set(0, -0.08, fataZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
         new THREE.MeshLambertMaterial({ color: 0xb88d8d}),
        matPereteInteriorCamera
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, fataZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        new THREE.MeshLambertMaterial({ color: 0xb88d8d}),
        matPereteInteriorCamera
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, fataZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, fataZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaBirou1((birou1) => {
        birou1.position.set(-0.5, -1.2, fataZ - 0.85);
        birou1.rotation.y = 0;
        grupCamera.add(birou1);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0.5, 0.5, fataZ - 1.5);
        grupCamera.add(ceas1);
    });

    creeazaLampa2((lampa2) => {
        lampa2.position.set(-0.7, -0.65, fataZ - 1.3);
        grupCamera.add(lampa2);
    });

    creeazaCalorifer((calorifer) => {
        calorifer.position.set(-0.1, -0.9, fataZ - 1.5);
        grupCamera.add(calorifer);
    });

    creeazaScaun4((scaun4) => {
        scaun4.position.set(0, -1.2, fataZ - 0.85);
        scaun4.rotation.z = 4;
        grupCamera.add(scaun4);
    });
    return grupCamera;
}

function creeazaCamera4() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 2.7;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x7b8f72 });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0xa7b39a });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    // mobila
    creeazaScaun3((scaun3) => {
        scaun3.position.set(-0.25, -1.25, frontZ - 1.55);
        scaun3.rotation.y = Math.PI / 2;
        grupCamera.add(scaun3);
    });

    creeazaMasa3((masa3) => {
        masa3.position.set(0.35, -1.32, frontZ - 1.2);
        grupCamera.add(masa3);
    });

    creeazaCovor2((covor2) => {
        covor2.position.set(0, -1.3, frontZ - 1);
        grupCamera.add(covor2);
    });

    creeazaLampa1((lampa1) => {
        lampa1.position.set(0.4, 0.75, frontZ - 2);
        grupCamera.add(lampa1);
    });

    creeazaCarte((carte) => {
        carte.position.set(0.15, -0.6, frontZ - 1);
        grupCamera.add(carte);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(-0.8, -1.36, frontZ - 0.85);
    planta.rotation.y = -0.45;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera5() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 2.7;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x5c7fa8 });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0x7e97bc });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaScaun4((scaun4) => {
        scaun4.position.set(0, -1.25, frontZ - 1.7);
        grupCamera.add(scaun4);
    });

    creeazaDulap1((dulap1) => {
        dulap1.position.set(-0.35, -1.15, frontZ - 1.15);
        dulap1.rotation.y = 0;
        grupCamera.add(dulap1);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0, 0.5, frontZ - 1.45);
        grupCamera.add(ceas1);
    });

    creeazaLampa2((lampa2) => {
        lampa2.position.set(-0.55, -0.5, frontZ - 0.7);
        grupCamera.add(lampa2);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(0.75, -1.36, frontZ - 0.75);
    planta.rotation.y = -0.3;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera6() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x9178a5 });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0xbba5ca });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaPat2((pat2) => {
        pat2.position.set(-0.2, -0.9, frontZ - 1.2);
        pat2.rotation.y = 0;
        grupCamera.add(pat2);
    });

    creeazaNoptiera2((noptiera2) => {
        noptiera2.position.set(0.75, -1.3, frontZ - 1.5);
        grupCamera.add(noptiera2);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0.8, -0.63, frontZ - 1.5);
        grupCamera.add(ceas1);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(0.8, -1.36, frontZ - 0.95);
    planta.rotation.y = -0.5;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera7() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori perete
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x8a5a3b });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0xd6b894 });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    creeazaBirou4((birou4) => {
        birou4.position.set(-0.05, -0.6, frontZ - 1.75);
        birou4.rotation.y = Math.PI;
        grupCamera.add(birou4);
    });

    creeazaScaun2((scaun2) => {
        scaun2.position.set(-0.1, -1.5, frontZ - 0.9);
        scaun2.rotation.y = 4;
        grupCamera.add(scaun2);
    });

    creeazaLampa2((lampa2) => {
        lampa2.position.set(-0.25, -0.6, frontZ - 1.65);
        grupCamera.add(lampa2);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0.4, 0.45, frontZ - 1.5);
        grupCamera.add(ceas1);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(0.75, -1.36, frontZ - 0.85);
    planta.rotation.y = -0.25;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera8() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x507d7b });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0x8aa3a1 });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    creeazaCanapea2((canapea2) => {
        canapea2.position.set(0, -1.15, frontZ - 1.6);
        grupCamera.add(canapea2);
    });

    creeazaMasa4((masa4) => {
        masa4.position.set(0.1, -1.22, frontZ - 1.0);
        grupCamera.add(masa4);
    });

    creeazaCovor1((covor1) => {
        covor1.position.set(0, -1.38, frontZ - 1.2);
        grupCamera.add(covor1);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0, 0.45, frontZ - 1.5);
        grupCamera.add(ceas1);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(0.8, -1.36, frontZ - 0.6);
    planta.rotation.y = -0.35;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera9() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culoare perete
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x734f4f });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0xb18b82 });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);


    creeazaDulap1((dulap1) => {
        dulap1.position.set(0.75, -1.15, frontZ - 1);
        dulap1.rotation.y = Math.PI;
        grupCamera.add(dulap1);
    });

    creeazaLampa1((lampa1) => {
        lampa1.position.set(-0.4, 0.5, frontZ - 1.55);
        grupCamera.add(lampa1);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0.3, 0.45, frontZ - 1.5);
        grupCamera.add(ceas1);
    });

    creeazaCovor1((covor) => {    
        covor.position.set(0, -1.2, frontZ - 1.2);
        grupCamera.add(covor);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(-0.8, -1.36, frontZ - 0.75);
    planta.rotation.y = 0.35;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera10() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x537c8f });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0x89a9ba });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaScaun4((scaun4) => {
        scaun4.position.set(0.25, -1.25, frontZ - 0.7);
        scaun4.rotation.z = Math.PI;
        grupCamera.add(scaun4);
    });

    creeazaMasa4((masa4) => {
        masa4.position.set(-0.15, -1.2, frontZ - 1.2);
        grupCamera.add(masa4);
    });

    creeazaCovor2((covor2) => {
        covor2.position.set(0, -1.3, frontZ - 1);
        grupCamera.add(covor2);
    });

    creeazaLampa1((lampa1) => {
        lampa1.position.set(0.5, 0.5, frontZ - 1.93);
        grupCamera.add(lampa1);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(-0.75, -1.36, frontZ - 0.6);
    planta.rotation.y = 0.4;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera11() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x303f6f });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0x5f72a2 });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaScaun2((scaun2) => {
        scaun2.position.set(0.25, -1.25, frontZ - 0.5);
        scaun2.rotation.y = - Math.PI / 4;
        grupCamera.add(scaun2);
    });

    creeazaDulap1((dulap1) => {
        dulap1.position.set(-0.35, -1.25, frontZ - 1.15);
        dulap1.rotation.y = Math.PI;
        grupCamera.add(dulap1);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(0, 0.5, frontZ - 1.45);
        grupCamera.add(ceas1);
    });

    creeazaLampa2((lampa2) => {
        lampa2.position.set(-0.55, -0.5, frontZ - 1.45);
        grupCamera.add(lampa2);
    });

    const planta = creeazaPlantaMare();
    planta.position.set(-0.75, -1.36, frontZ - 0.75);
    planta.rotation.y = 0.3;
    grupCamera.add(planta);

    return grupCamera;
}

function creeazaCamera12() {
    const grupCamera = new THREE.Group();
    const latime = 2.0;
    const inaltime = 3;
    const adancime = 2.2;
    const frontZ = 2.45;
    const grosimePerete = 0.12;

    //culori pereti
    const matPereteSpate = new THREE.MeshLambertMaterial({ color: 0x8b6d8c });
    const matPereteLaterale = new THREE.MeshLambertMaterial({ color: 0xc7acc9 });

    //podea
    const podea = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.06, adancime),
        matPodeaInteriorCamera
    );
    podea.position.set(0, -1.36, frontZ - adancime / 2);
    grupCamera.add(podea);

    //pereti
    const pereteSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latime + grosimePerete * 2, inaltime, grosimePerete),
        matPereteSpate
    );
    pereteSpate.position.set(0, -0.08, frontZ - adancime + grosimePerete / 2);
    grupCamera.add(pereteSpate);

    const pereteStanga = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteStanga.position.set(-latime / 2 - grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteStanga);

    const pereteDreapta = new THREE.Mesh(
        new THREE.BoxGeometry(grosimePerete, inaltime, adancime + grosimePerete),
        matPereteLaterale
    );
    pereteDreapta.position.set(latime / 2 + grosimePerete / 2, -0.08, frontZ - adancime / 2);
    grupCamera.add(pereteDreapta);

    //plinta
    const plinta = new THREE.Mesh(
        new THREE.BoxGeometry(latime, 0.12, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xc9c1b3 })
    );
    plinta.position.set(0, -1.34, frontZ - adancime + 0.1);
    grupCamera.add(plinta);

    //mobila
    creeazaPat5((pat5) => {
        pat5.position.set(0, -2.2, frontZ - 1.5);
        grupCamera.add(pat5);
    });

    creeazaCeas1((ceas1) => {
        ceas1.position.set(-0.2, 0.7, frontZ - 1.65);
        grupCamera.add(ceas1);
    });

    creeazaCovor1((covor2) => {
        covor2.position.set(0, -1.3, frontZ - 1);
        grupCamera.add(covor2);
    });
    return grupCamera;
}


// (include podea, pereti exteriori, pereti interiori)
function creeazaEtaj(numarEtaj, esteParter = false) {
    const grupEtaj = new THREE.Group();
    const inaltimeEtaj = 3; // inaltime camera

    const podea = new THREE.Mesh(geoPlanseu, matAlbRama);
    podea.position.y = -inaltimeEtaj / 2;
    grupEtaj.add(podea);

    const pozitiiFerestreX = [-5.8, -4.2, -1.8, 1.8, 4.2, 5.8];
    const zFatada = 2.5;
    const grosimeFatada = 0.2;
    const minX = -7;
    const maxX = 7;
    const minY = -1.5;
    const maxY = 1.5;
    const golY = 0;
    const golInaltime = 1.84;
    const golLatimeSingle = 1.08;

    const goluri = [];
    pozitiiFerestreX.forEach((x) => {
        if (esteParter && (x === -1.8 || x === 1.8)) {
            return;
        }
        goluri.push({
            x1: x - golLatimeSingle / 2,
            x2: x + golLatimeSingle / 2,
            y1: golY - golInaltime / 2,
            y2: golY + golInaltime / 2
        });
    });

    const getMaterialForX = (x) => {
        if (x < -3 || x > 3) {
            return matRosuCaramiziu;
        }
        return matOranjDeschis;
    };

    const adaugaPanel = (x1, x2, y1, y2) => {
        if (x2 <= x1 || y2 <= y1) return;

        const material = getMaterialForX((x1 + x2) / 2);
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(x2 - x1, y2 - y1, grosimeFatada),
            material
        );
        panel.position.set((x1 + x2) / 2, (y1 + y2) / 2, zFatada);
        grupEtaj.add(panel);
    };

    let lastX = minX;
    goluri.forEach((gol) => {
        adaugaPanel(lastX, gol.x1, minY, maxY);
        adaugaPanel(gol.x1, gol.x2, gol.y2, maxY);
        adaugaPanel(gol.x1, gol.x2, minY, gol.y1);
        lastX = gol.x2;
    });
    adaugaPanel(lastX, maxX, minY, maxY);

    // pereti laterali
    const pereteLateralStanga = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 5), matRosuCaramiziu);
    pereteLateralStanga.position.set(-7, 0, 0);
    grupEtaj.add(pereteLateralStanga);

    const pereteLateralDreapta = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 5), matRosuCaramiziu);
    pereteLateralDreapta.position.set(7, 0, 0);
    grupEtaj.add(pereteLateralDreapta);

    const pereteSpate = new THREE.Mesh(new THREE.BoxGeometry(14.2, 3, 0.2), matRosuCaramiziu);
    pereteSpate.position.set(0, 0, -2.5);
    grupEtaj.add(pereteSpate);


    // pereti interiori
    const pereteInt1 = new THREE.Mesh(geoPereteInterior, matAlbRama); 
    pereteInt1.position.set(-3, 0, 0);
    grupEtaj.add(pereteInt1);

    const pereteInt2 = new THREE.Mesh(geoPereteInterior, matAlbRama);
    pereteInt2.position.set(3, 0, 0);
    grupEtaj.add(pereteInt2);


    pozitiiFerestreX.forEach((x, index) => {
        // usa de la parter
        if (esteParter && (x === -1.8 || x === 1.8)) {
            return;
        }

        const win = creeazaFereastra();
        win.position.set(x, 0, 2.6); // pozitionata pe fatada
        grupEtaj.add(win);
        const esteCameraInteractiva =
            !(esteParter && (index === 2 || index === 3));

        if (esteCameraInteractiva) {
            const geamSticlaMesh = win.userData.sticla;
            const geamRamaMesh = win.userData.rama;
            const geamPervazMesh = win.userData.pervaz;

            const matRamaInteractiva = matAlbRama.clone();
            matRamaInteractiva.transparent = true;
            matRamaInteractiva.opacity = 0.95;

            geamRamaMesh.material = matRamaInteractiva;
            geamPervazMesh.material = matRamaInteractiva;

            geamSticlaMesh.material = new THREE.MeshStandardMaterial({
                color: 0x05070d,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                roughness: 0.92,
                metalness: 0.02,
                emissive: 0x000000,
                emissiveIntensity: 0
            });

            let cameraInterior;
            const etajPar = numarEtaj % 2 === 0; // true pentru etaje pare (0, 2, 4...)
            
            switch (index) {
                case 0:
                    cameraInterior = etajPar ? creeazaCamera1() : creeazaCamera7();
                    break;
                case 1:
                    cameraInterior = etajPar ? creeazaCamera2() : creeazaCamera8();
                    break;
                case 2:
                    cameraInterior = etajPar ? creeazaCamera3() : creeazaCamera9();
                    break;
                case 3:
                    cameraInterior = etajPar ? creeazaCamera4() : creeazaCamera10();
                    break;
                case 4:
                    cameraInterior = etajPar ? creeazaCamera5() : creeazaCamera11();
                    break;
                case 5:
                    cameraInterior = etajPar ? creeazaCamera6() : creeazaCamera12();
                    break;
                default:
                    cameraInterior = etajPar ? creeazaCamera1() : creeazaCamera7();
            }

            cameraInterior.position.set(x, 0, 0);
            cameraInterior.visible = false;
            grupEtaj.add(cameraInterior);

            geamuriInteractiveMeshes.push(geamSticlaMesh);
            geamuriInteractiveRame.push(geamRamaMesh);
            geamuriInteractivePervaze.push(geamPervazMesh);

            apartamente.push({
                etaj: numarEtaj,
                coloana: index,
                geamMesh: geamSticlaMesh,
                ramaMesh: geamRamaMesh,
                pervazMesh: geamPervazMesh,
                roomGroup: cameraInterior
            });
        }
    });

    if (esteParter) {
        const usaIntrare = creeazaUsaIntrare();
        usaIntrare.position.set(0, -0.35, 2.61);
        grupEtaj.add(usaIntrare);
    }

    if (numarEtaj === numarEtaje - 1) {
        becTavanMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xfff4d8,
                emissive: 0xffd782,
                emissiveIntensity: 0
            })
        );
        becTavanMesh.position.set(5, 1.34, 0.5);
        grupEtaj.add(becTavanMesh);

        luminaCamera = new THREE.PointLight(0xffe6b8, 0, 12, 2);
        luminaCamera.position.set(5, 1.2, 0.35);
        grupEtaj.add(luminaCamera);
    }

    return grupEtaj;
}


function creeazaBanca() {
    const grupBanca = new THREE.Group();
    const lungimeBanca = 2.7;

    function creeazaSuportLateral(xPos) {
        const suport = new THREE.Group();
        
        const piciorFrontal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.12), matMetalUrban);
        piciorFrontal.position.set(0, 0.45, 0.2);
        piciorFrontal.rotation.x = 0.1;
        suport.add(piciorFrontal);

        const piciorSpate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.12), matMetalUrban);
        piciorSpate.position.set(0, 0.7, -0.25);
        piciorSpate.rotation.x = -0.15;
        suport.add(piciorSpate);

        const cotiera = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.65), matMetalUrban);
        cotiera.position.set(0, 0.95, 0);
        suport.add(cotiera);

        suport.position.x = xPos;
        return suport;
    }

    grupBanca.add(creeazaSuportLateral(-1.2));
    grupBanca.add(creeazaSuportLateral(1.2));

    const nrLameleSezut = 6;
    for (let i = 0; i < nrLameleSezut; i++) {
        const lamela = new THREE.Mesh(
            new THREE.BoxGeometry(lungimeBanca, 0.05, 0.12), 
            matLemnBanca
        );

        // poz curbata
        const zPos = 0.3 - (i * 0.14);
        const yPos = 0.88 - Math.pow(i, 2) * 0.005; 
        lamela.position.set(0, yPos, zPos);
        grupBanca.add(lamela);
    }

    const nrLameleSpatar = 4;
    for (let i = 0; i < nrLameleSpatar; i++) {
        const lamela = new THREE.Mesh(
            new THREE.BoxGeometry(lungimeBanca, 0.12, 0.05), 
            matLemnBanca
        );
        
        lamela.rotation.x = -0.25;
        lamela.position.set(0, 1.15 + (i * 0.15), -0.28 - (i * 0.04));
        grupBanca.add(lamela);
    }

    const bara = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.06, 0.06), 
        matMetalUrban
    );
    bara.position.set(0, 0.3, -0.1);
    grupBanca.add(bara);

    return grupBanca;
}

function creeazaFelinar() {
    const grupFelinar = new THREE.Group();

    const soclu = new THREE.Mesh(
        new THREE.CylinderGeometry(0.31, 0.36, 0.05, 20),
        new THREE.MeshLambertMaterial({ color: 0x5c636d })
    );
    soclu.position.y = 0.025;
    grupFelinar.add(soclu);

    const baza = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.14, 20), matMetalUrban);
    baza.position.y = 0.1;
    grupFelinar.add(baza);

    const stalp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.9, 18), matMetalUrban);
    stalp.position.y = 2.52;
    grupFelinar.add(stalp);

    const nodSuperior = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), matMetalUrban);
    nodSuperior.position.set(0, 4.95, 0);
    grupFelinar.add(nodSuperior);

    const brat = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.07, 0.07), matMetalUrban);
    brat.position.set(0.45, 4.95, 0);
    grupFelinar.add(brat);

    const corpFelinar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.24, 0.62, 10),
        new THREE.MeshLambertMaterial({ color: 0x141b29 })
    );
    corpFelinar.position.set(0.97, 4.62, 0);
    grupFelinar.add(corpFelinar);

    const geamFelinar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.36, 10),
        new THREE.MeshBasicMaterial({ color: 0xffdf9a, transparent: true, opacity: 0.78 })
    );
    geamFelinar.position.copy(corpFelinar.position);
    grupFelinar.add(geamFelinar);

    const capacFelinar = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.18, 10), matMetalUrban);
    capacFelinar.position.set(0.97, 4.98, 0);
    grupFelinar.add(capacFelinar);

    const glowInterior = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xfff1cd, transparent: true, opacity: 0.42, depthWrite: false })
    );
    glowInterior.position.copy(corpFelinar.position);
    grupFelinar.add(glowInterior);

    const texturaLumina = creeazaTexturaLuminaFelinar();
    const pataLumina = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 5.4),
        new THREE.MeshBasicMaterial({
            map: texturaLumina,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        })
    );
    pataLumina.rotation.x = -Math.PI / 2;
    pataLumina.position.set(0.96, 0.012, 0);
    grupFelinar.add(pataLumina);

    const spotFelinar = new THREE.SpotLight(0xffe0a3, 3.6, 28, 0.88, 0.9, 1.35);
    spotFelinar.position.copy(corpFelinar.position);
    spotFelinar.target.position.set(0.96, 0.0, 0);
    grupFelinar.add(spotFelinar);
    grupFelinar.add(spotFelinar.target);

    const luminaDiffuza = new THREE.PointLight(0xffe7b8, 0.9, 10, 2);
    luminaDiffuza.position.set(0.96, 4.55, 0);
    grupFelinar.add(luminaDiffuza);

    return grupFelinar;
}

function creeazaCosGunoi() {
    const grupCos = new THREE.Group();

    const baza = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.08, 16), matMetalUrban);
    baza.position.y = 0.04;
    grupCos.add(baza);

    const corp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.25, 0.72, 16, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2f3a4a, roughness: 0.65, metalness: 0.35, side: THREE.DoubleSide })
    );
    corp.position.y = 0.45;
    grupCos.add(corp);

    const inelSuperior = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 10, 22), matMetalUrban);
    inelSuperior.rotation.x = Math.PI / 2;
    inelSuperior.position.y = 0.82;
    grupCos.add(inelSuperior);

    const capac = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 16), matMetalUrban);
    capac.position.y = 0.88;
    grupCos.add(capac);

    return grupCos;
}

function creeazaTexturaLuminaFelinar() {
    const dim = 256;
    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(dim / 2, dim / 2, 18, dim / 2, dim / 2, dim / 2);
    gradient.addColorStop(0, 'rgba(255, 237, 191, 0.95)');
    gradient.addColorStop(0.18, 'rgba(255, 226, 160, 0.78)');
    gradient.addColorStop(0.45, 'rgba(255, 208, 128, 0.34)');
    gradient.addColorStop(0.75, 'rgba(255, 196, 102, 0.10)');
    gradient.addColorStop(1, 'rgba(255, 196, 102, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dim, dim);

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
}


function creeazaCopac() {
    const grupCopac = new THREE.Group();
    const pivotiRamuri = [];
    const noduriFrunzis = [];

    const matTrunchi = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
    const matFrunzaInchis = new THREE.MeshLambertMaterial({ color: 0x1a3d17, side: THREE.DoubleSide });
    const matFrunzaDeschis = new THREE.MeshLambertMaterial({ color: 0x2d5a27, side: THREE.DoubleSide });
    const formaFrunza = new THREE.Shape();
    formaFrunza.moveTo(0, 0.24);
    formaFrunza.quadraticCurveTo(0.18, 0.14, 0.1, -0.08);
    formaFrunza.quadraticCurveTo(0.04, -0.22, 0, -0.28);
    formaFrunza.quadraticCurveTo(-0.04, -0.22, -0.1, -0.08);
    formaFrunza.quadraticCurveTo(-0.18, 0.14, 0, 0.24);

    const geoFrunzaPlata = new THREE.ShapeGeometry(formaFrunza);
    geoFrunzaPlata.computeVertexNormals();

    const trunchiGeom = new THREE.CylinderGeometry(0.18, 0.3, 5.8, 12);
    const trunchi = new THREE.Mesh(trunchiGeom, matTrunchi);
    trunchi.position.y = 2.9;
    grupCopac.add(trunchi);

    const configRamuri = [
        { y: 2.5, rZ: 0.8, rY: 0, L: 5.1, G: 0.18 },
        { y: 3.0, rZ: -0.9, rY: 1.5, L: 4.8, G: 0.165 },
        { y: 3.5, rZ: 0.7, rY: 3.1, L: 4.6, G: 0.15 },
        { y: 4.0, rZ: -0.6, rY: 4.5, L: 4.3, G: 0.13 },
        { y: 4.5, rZ: 0.4, rY: 0.8, L: 4.0, G: 0.11 },
        { y: 5.5, rZ: 0.2, rY: 2.2, L: 3.5, G: 0.09 }
    ];

    configRamuri.forEach(info => {
        const pivot = new THREE.Group();
        pivot.position.y = info.y;
        pivot.rotation.y = info.rotY || info.rY;
        pivot.rotation.z = info.rotZ || info.rZ;
        pivot.userData.baseRotZ = pivot.rotation.z;
        grupCopac.add(pivot);
        pivotiRamuri.push(pivot);

        const bratGeom = new THREE.CylinderGeometry(info.G * 0.5, info.G, info.L, 6);
        const brat = new THREE.Mesh(bratGeom, matTrunchi);
        brat.position.y = info.L / 2;
        pivot.add(brat);

        // frunzis
        const pasiFrunzis = 12; 
        for (let i = 2; i <= pasiFrunzis; i++) {
            const fractie = i / pasiFrunzis;
            const posL = fractie * info.L;
            
            const nodFrunzis = new THREE.Group();
            nodFrunzis.position.y = posL;
            nodFrunzis.userData.baseRotX = 0;
            nodFrunzis.userData.baseRotZ = 0;
            pivot.add(nodFrunzis);
            noduriFrunzis.push(nodFrunzis);

            // cu cat suntem mai spre varf, cu atat sunt mai multe frunze
            const densitate = Math.floor(fractie * 55) + 6; 
            const razaExplozie = 0.7 + fractie * 1.85;

            for (let j = 0; j < densitate; j++) {
                const matF = Math.random() > 0.5 ? matFrunzaDeschis : matFrunzaInchis;
                const frunza = new THREE.Mesh(geoFrunzaPlata, matF);
                
                // pozitionare sferica random in jurul ramurii
                frunza.position.set(
                    (Math.random() - 0.5) * razaExplozie,
                    (Math.random() - 0.5) * razaExplozie,
                    (Math.random() - 0.5) * razaExplozie
                );
                
                frunza.rotation.set(
                    (Math.random() - 0.5) * 0.8,
                    Math.random() * Math.PI * 2,
                    (Math.random() - 0.5) * 1.1
                );
                const scalaFrunza = 0.32 + Math.random() * 0.22;
                frunza.scale.set(scalaFrunza, scalaFrunza, scalaFrunza);
                nodFrunzis.add(frunza);
            }
        }
    });

    // pt a umple mijlocul coroanei
    const umpluturaCores = 240;
    for(let k = 0; k < umpluturaCores; k++) {
        const matF = Math.random() > 0.3 ? matFrunzaInchis : matFrunzaDeschis;
        const f = new THREE.Mesh(geoFrunzaPlata, matF);
        f.position.set(
            (Math.random() - 0.5) * 4.1,
            5.1 + (Math.random() - 0.5) * 4.7,
            (Math.random() - 0.5) * 4.1
        );
        f.rotation.set(
            (Math.random() - 0.5) * 0.9,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * 1.2
        );
        const scalaNucleu = 0.42 + Math.random() * 0.3;
        f.scale.set(scalaNucleu, scalaNucleu, scalaNucleu);
        grupCopac.add(f);
    }

    grupCopac.userData.wind = {
        trunchi,
        pivotiRamuri,
        noduriFrunzis,
        phase: Math.random() * Math.PI * 2,
        strength: 0.75 + Math.random() * 0.35
    };

    return grupCopac;
}


function creeazaZonaExterioara() {
    const grupExterior = new THREE.Group();
    scene.add(grupExterior);

    const nivelSol = -inaltimeEtaj / 2; // nivelul de referinta

    const latimeTrotuar = 55;
    const adancimeTrotuar = 6;
    const formaTrotuar = new THREE.Shape();
    
    formaTrotuar.moveTo(-latimeTrotuar / 2, 0);
    formaTrotuar.lineTo(latimeTrotuar / 2, 0);
    formaTrotuar.lineTo(latimeTrotuar / 2, adancimeTrotuar);
    formaTrotuar.lineTo(-latimeTrotuar / 2, adancimeTrotuar);
    formaTrotuar.lineTo(-latimeTrotuar / 2, 0);

    const pozitiiCopaciX = [-25, -20, -17, 14, 16, 22];
    const razaGaura = 0.75; 

    pozitiiCopaciX.forEach(x => {
        const gaura = new THREE.Path();
        gaura.absarc(x, 4, razaGaura, 0, Math.PI * 2, true); 
        formaTrotuar.holes.push(gaura);
    });

    const extrudeSettings = { depth: 0.24, bevelEnabled: false }; // sa nu rotunjeasca marginile
    const geoTrotuarGaurit = new THREE.ExtrudeGeometry(formaTrotuar, extrudeSettings);
    const trotuarMesh = new THREE.Mesh(geoTrotuarGaurit, matTrotuarRealist);
    
    trotuarMesh.rotation.x = -Math.PI / 2;
    trotuarMesh.position.set(0, nivelSol - 0.1, 8); 
    grupExterior.add(trotuarMesh);


    pozitiiCopaciX.forEach((x, index) => {
        
        const pamant = new THREE.Mesh(new THREE.CircleGeometry(razaGaura, 32), matPamantAlveola);
        pamant.rotation.x = -Math.PI / 2;
        pamant.position.set(x, nivelSol - 0.09, 4); 
        grupExterior.add(pamant);

        
        const borduraRot = new THREE.Mesh(new THREE.TorusGeometry(razaGaura, 0.04, 12, 32), matBorduraAlveola);
        borduraRot.rotation.x = -Math.PI / 2;
        borduraRot.position.set(x, nivelSol, 4); 
        grupExterior.add(borduraRot);

        
        const copac = creeazaCopac();
        copac.position.set(x, nivelSol, 4); 
        copac.scale.setScalar(0.95 + (index % 3) * 0.08);
        grupExterior.add(copac);
        copaciCuVant.push(copac);
    });

    // bordura
    const lungimeBorduraSegment = 5;
    const numarSegmenteBordura = Math.floor(latimeTrotuar / lungimeBorduraSegment / 2);
    for (let i = -numarSegmenteBordura; i <= numarSegmenteBordura; i++) {
        const variatieInaltime = (Math.random() * 0.02);
        const bordura = new THREE.Mesh(
            new THREE.BoxGeometry(lungimeBorduraSegment - 0.05, 0.3 + variatieInaltime, 0.25), 
            matBorduraRealista
        );
        bordura.position.set(i * lungimeBorduraSegment, nivelSol + 0.05, 8); 
        grupExterior.add(bordura);
    }

    // strada
    const strada = new THREE.Mesh(new THREE.BoxGeometry(latimeTrotuar, 0.1, 12), matAsfalt);
    strada.position.set(0, nivelSol - 0.1, 14); 
    grupExterior.add(strada);

    for (let i = -6; i <= 6; i++) {
        const marcajAx = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.15), matMarcaj);
        marcajAx.position.set(i * 4, nivelSol - 0.04, 14);
        grupExterior.add(marcajAx);
    }

    // zid
    const zidSpate = new THREE.Mesh(
        new THREE.BoxGeometry(latimeTrotuar + 5, 3.2, 0.35),
        new THREE.MeshLambertMaterial({ color: 0x6a6e76 })
    );
    zidSpate.position.set(0, nivelSol + 1.5, 1.25);
    grupExterior.add(zidSpate);

    // banci
    const configuratiiBanci = [
        { x: -20, z: 5.8, rot: 0.04 },
        { x: -10, z: 5.6, rot: 0 },
        { x: 10, z: 5.6, rot: 0 },
        { x: 20, z: 5.8, rot: -0.04 }
    ];

    configuratiiBanci.forEach(({ x, z, rot }) => {
        const banca = creeazaBanca();
        banca.scale.set(0.8, 0.8, 0.8);
        banca.position.set(x, nivelSol, z);
        banca.rotation.y = rot;
        grupExterior.add(banca);
    });

    // cosuri gunoi
    const pozitiiCosuri = [
        { x: -17.5, z: 5.8 },
        { x: -8, z: 5.6 },
        { x: 12, z: 5.6 },
        { x: 22, z: 5.8 }
    ];

    pozitiiCosuri.forEach(({ x, z }) => {
        const cos = creeazaCosGunoi();
        cos.position.set(x, nivelSol, z);
        grupExterior.add(cos);
    });

    // felinare
    const pozitiiFelinare = [
        { x: -16.5, z: 7 },
        { x: -9.8, z: 7 },
        { x: 11.2, z: 7 },
        { x: 17.5, z: 7 }
    ];
    pozitiiFelinare.forEach(({ x, z }) => {
        const felinar = creeazaFelinar();
        felinar.position.set(x, nivelSol, z);
        grupExterior.add(felinar);
    });

}

const grupCladire = new THREE.Group();
scene.add(grupCladire);
grupCladire.position.z = 2;

const inaltimeEtaj = 3;
const numarEtaje = 4;

// cream etajele
for (let i = 0; i < numarEtaje; i++) {
    const esteParter = (i === 0);
    const etaj = creeazaEtaj(i, esteParter);
    etaj.position.y = i * inaltimeEtaj;
    grupCladire.add(etaj);
}

const tavanFinal = new THREE.Mesh(geoPlanseu, matAlbRama);
tavanFinal.position.y = numarEtaje * inaltimeEtaj - inaltimeEtaj / 2;
grupCladire.add(tavanFinal);


// acoperisul cladirii
const grupAcoperis = new THREE.Group();
grupAcoperis.position.y = numarEtaje * inaltimeEtaj + 0.1; // deasupra cladirii
grupCladire.add(grupAcoperis);

const bazaAcoperisGeom = new THREE.BoxGeometry(14.2, 0.5, 5.2);
const bazaAcoperisMesh = new THREE.Mesh(bazaAcoperisGeom, matAlbastruInchis);
grupAcoperis.add(bazaAcoperisMesh);

const mansardaGeom = new THREE.BoxGeometry(5.7, 2.3, 3.4);
const mansardaMesh = new THREE.Mesh(mansardaGeom, matAlbastruInchis);
mansardaMesh.position.set(0, 1.15, 0.65); // adus spre fata pentru a nu mai aparea ca dreptunghi in spate
grupAcoperis.add(mansardaMesh);

const geoFereastraRotunda = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
const fereastraRotunda = new THREE.Mesh(geoFereastraRotunda, matAlbastruInchis);
fereastraRotunda.rotation.x = Math.PI / 2;
fereastraRotunda.position.set(0, 1.5, 2.3);
grupAcoperis.add(fereastraRotunda);

const geoRamaRotunda = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 32);
const ramaRotunda = new THREE.Mesh(geoRamaRotunda, matAlbRama);
ramaRotunda.rotation.x = Math.PI / 2;
ramaRotunda.position.set(0, 1.5, 2.25);
grupAcoperis.add(ramaRotunda);

const cosGeom = new THREE.BoxGeometry(0.8, 1.5, 0.8);
const cos1 = new THREE.Mesh(cosGeom, matRosuCaramiziu);
cos1.position.set(-3.5, 1.5, 0);
grupAcoperis.add(cos1);

const cos2 = new THREE.Mesh(cosGeom, matRosuCaramiziu);
cos2.position.set(3.5, 1.5, 0);
grupAcoperis.add(cos2);

creeazaZonaExterioara();


// baza cladirii
const bazaGeom = new THREE.BoxGeometry(14.4, 0.4, 5.4);
const plintaMesh = new THREE.Mesh(bazaGeom, matGriScurt);
plintaMesh.position.y = -inaltimeEtaj / 2 + 0.12;
grupCladire.add(plintaMesh);

//nefolosita dupa adaugarea navigarii intre camere
function comutaModGeamInteractiv() {
    if (geamuriInteractiveMeshes.length === 0 || !luminaCamera || !becTavanMesh) {
        return;
    }

    cameraInModFocus = !cameraInModFocus;

    if (cameraInModFocus) {
        pornesteMuzicaCamera();

        const geamCurent = geamFocusMesh || geamInteractivMesh || geamuriInteractiveMeshes[0];
        const pozitieGeam = new THREE.Vector3();
        geamCurent.getWorldPosition(pozitieGeam);

        cameraTargetPosition.set(pozitieGeam.x + 0.02, pozitieGeam.y + 0.03, pozitieGeam.z + 0.75);
        cameraTargetLookAt.set(pozitieGeam.x - 0.03, pozitieGeam.y + 0.03, pozitieGeam.z - 2.35);
        cameraTargetFov = 46;

        luminaCamera.intensity = 2.9;
        becTavanMesh.material.emissiveIntensity = 1.15;
        geamuriInteractiveMeshes.forEach(mesh => {
            mesh.visible = true;
            mesh.material.opacity = 0.9;
        });
        geamCurent.visible = false;
        const indexGeamCurent = geamuriInteractiveMeshes.indexOf(geamCurent);

        geamuriInteractiveRame.forEach((rama, index) => {
            const pervaz = geamuriInteractivePervaze[index];
            const esteGeamulCurent = index === indexGeamCurent;
            const opacity = esteGeamulCurent ? 0.24 : 0.95;
            rama.material.opacity = opacity;
            pervaz.material.opacity = opacity;
        });
    } else {
        opresteMuzicaCamera();

        cameraTargetPosition.copy(cameraDefaultPosition);
        cameraTargetLookAt.copy(cameraDefaultLookAt);
        cameraTargetFov = cameraDefaultFov;

        luminaCamera.intensity = 0;
        becTavanMesh.material.emissiveIntensity = 0;
        geamuriInteractiveMeshes.forEach(mesh => {
            mesh.visible = true;
            mesh.material.opacity = 0.9;
        });
        geamuriInteractiveRame.forEach((rama, index) => {
            const pervaz = geamuriInteractivePervaze[index];
            rama.material.opacity = 0.95;
            pervaz.material.opacity = 0.95;
        });
        geamFocusMesh = null;
    }
}

function focusPeApartament(ap) { 

    if (!ap) return; 

    const pozitieGeam = new THREE.Vector3(); 
    ap.geamMesh.getWorldPosition(pozitieGeam); 
    
    cameraTargetPosition.set( 
        pozitieGeam.x, 
        pozitieGeam.y + 0.03, 
        pozitieGeam.z + 0.75 
    ); 
    
    cameraTargetLookAt.set( 
        pozitieGeam.x, 
        pozitieGeam.y, 
        pozitieGeam.z - 2.35 
    ); 
    
    cameraTargetFov = 46; 
    cameraInModFocus = true; 
    pornesteMuzicaCamera(); 
    
    if (luminaCamera) { 
        luminaCamera.intensity = 2.9; 
    } 
    
    if (becTavanMesh) { 
        becTavanMesh.material.emissiveIntensity = 1.15; 
    } 
    
    geamuriInteractiveMeshes.forEach(mesh => { 
        mesh.visible = true; 
        mesh.material.opacity = 0.9; 
    }); 
    
    ap.geamMesh.visible = false; 
    
    apartamente.forEach((item) => {
        if (item.roomGroup) {
            item.roomGroup.visible = item === ap;
        }
    });
    
    geamuriInteractiveRame.forEach((rama, index) => { 
        
        const pervaz = geamuriInteractivePervaze[index]; 
        const apRef = apartamente[index]; 
        
        const esteCurent = 
            apRef.geamMesh === ap.geamMesh; 
            
        rama.material.opacity = 
            esteCurent ? 0.24 : 0.95; 
        
        pervaz.material.opacity = 
            esteCurent ? 0.24 : 0.95; }); 
        
}

function iesireDinFocus() { 
    
    cameraInModFocus = false; 
    apartamentCurent = null; 
    opresteMuzicaCamera(); 
    
    cameraTargetPosition.copy(cameraDefaultPosition); 
    cameraTargetLookAt.copy(cameraDefaultLookAt); 
    cameraTargetFov = cameraDefaultFov; 
    
    if (luminaCamera) { 
        luminaCamera.intensity = 0; 
    } 
    
    if (becTavanMesh) { 
        becTavanMesh.material.emissiveIntensity = 0; 
    } 
    
    geamuriInteractiveMeshes.forEach(mesh => { 
        mesh.visible = true; 
        mesh.material.opacity = 0.9; 
    }); 
    
    apartamente.forEach((item) => {
        if (item.roomGroup) {
            item.roomGroup.visible = false;
        }
    });
    
    geamuriInteractiveRame.forEach((rama, index) => { 
        const pervaz = geamuriInteractivePervaze[index]; 
        rama.material.opacity = 0.95; 
        pervaz.material.opacity = 0.95; 
    }); 
    
    geamFocusMesh = null; 

}

function onPointerDown(event) {
    if (geamuriInteractiveMeshes.length === 0) {
        return;
    }

    if (cameraInModFocus) {
        iesireDinFocus();
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersectii = raycaster.intersectObjects(geamuriInteractiveMeshes, false);
    if (intersectii.length > 0) {

        const mesh = intersectii[0].object; 

        apartamentCurent = apartamente.find( 
            a => a.geamMesh === mesh 
        ); 
        
        geamFocusMesh = mesh; 
        
        focusPeApartament(apartamentCurent);
    }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('keydown', onKeyDown);

function onKeyDown(event) { 
    
    if (!apartamentCurent) 
        return; 

    let etaj = apartamentCurent.etaj; 
    let coloana = apartamentCurent.coloana; 
    
    switch(event.key) { 
        case 'ArrowLeft': 
            coloana--; 
            break; 

        case 'ArrowRight': 
            coloana++; 
            break;
            
        case 'ArrowUp': 
            etaj++; 
            break; 
            
        case 'ArrowDown': 
            etaj--; 
            break; 
            
        default: 
            return;
    } 
    
    const apartamentNou = apartamente.find(a => 
        a.etaj === etaj && 
        a.coloana === coloana 
    ); 
    
    if (apartamentNou) { 
        
        apartamentCurent = apartamentNou; 
        geamFocusMesh = apartamentNou.geamMesh; 
        focusPeApartament(apartamentNou); 
    } 
    else { 
        iesireDinFocus(); 
    } 
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const timpCurent = performance.now();
    const deltaTimp = (timpCurent - timpRandareAnterior) / 1000;
    timpRandareAnterior = timpCurent;
    timpTotalAnimatie += deltaTimp;
    const t = timpTotalAnimatie;

    if (starsLayerNear) {
        starsLayerNear.rotation.y = t * 0.006;
        starsLayerNear.rotation.x = Math.sin(t * 0.02) * 0.02;
    }

    if (starsLayerFar) {
        starsLayerFar.rotation.y = -t * 0.0035;
    }

    if (starsNearMaterial) {
        starsNearMaterial.opacity = 0.68 + Math.sin(t * 1.2) * 0.08;
    }

    if (starsFarMaterial) {
        starsFarMaterial.opacity = 0.46 + Math.sin(t * 0.9 + 1.4) * 0.06;
    }

    copaciCuVant.forEach(copac => {
        const windData = copac.userData.wind;
        if (!windData) {
            return;
        }

        const time = t * windData.strength;
        const trunchiTilt = Math.sin(time * 0.8 + windData.phase) * 0.02;
        windData.trunchi.rotation.z = trunchiTilt;

        windData.pivotiRamuri.forEach((pivot, index) => {
            const sway = Math.sin(time * 1.25 + windData.phase + index * 0.7) * (0.035 + index * 0.003);
            pivot.rotation.z = pivot.userData.baseRotZ + sway;
        });

        windData.noduriFrunzis.forEach((nod, index) => {
            nod.rotation.x = Math.sin(time * 2.1 + windData.phase + index * 0.35) * 0.075;
            nod.rotation.z = Math.cos(time * 1.8 + windData.phase + index * 0.28) * 0.05;
        });
    });

    camera.position.lerp(cameraTargetPosition, 0.07);
    cameraLookAtCurent.lerp(cameraTargetLookAt, 0.08);
    camera.fov += (cameraTargetFov - camera.fov) * 0.08;
    camera.updateProjectionMatrix();
    camera.lookAt(cameraLookAtCurent);

    renderer.render(scene, camera);
}
animate();