import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, analyser, dataArray;
let group, sphere, controls;

const points = [];
const spacing = 5;
const gridSize = 5;

let currentIdx = 0;
let lerpT = 0;

function buildPath() {
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let y = -gridSize; y <= gridSize; y++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        if (Math.random() > 0.96) {
          points.push(new THREE.Vector3(x * spacing, y * spacing, z * spacing));
        }
      }
    }
  }
  if (points.length < 2) {
    points.push(new THREE.Vector3(-spacing, 0, 0));
    points.push(new THREE.Vector3(spacing, 0, 0));
  }
}

export async function startVisualizer(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.set(0, 20, 60);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.enableDamping = true;

  group = new THREE.Group();
  scene.add(group);

  const len = 1000;
  const addAxis = (dir) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3().setComponent(dir, -len),
      new THREE.Vector3().setComponent(dir,  len)
    ]);
    group.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff })));
  };
  addAxis(0); addAxis(1); addAxis(2);

  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  group.add(sphere);

  const light = new THREE.AmbientLight( 0x404040 ); 
  scene.add( light );
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);

  buildPath();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
  } catch (e) {
    console.error(e);
    alert('Микрофон недоступен');
  }

  window.addEventListener('resize', () => {
    const ww = container.clientWidth, hh = container.clientHeight;
    renderer.setSize(ww, hh);
    labelRenderer.setSize(ww, hh);
    camera.aspect = ww / hh;
    camera.updateProjectionMatrix();
  });

  animate();
}

function band(start, end) {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += dataArray[i] || 0;
  }
  return sum / (end - start + 1) / 255;
}

let targetPosition = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  const lowFreq  = band(0, 4);
  const midFreq  = band(5, 24);
  const highFreq = band(25, 63);

  targetPosition.set(
    lowFreq * 75,
    midFreq * 75,
    highFreq * 75,
  );

  sphere.position.lerp(targetPosition, 0.1);

  group.rotation.y += 0.002;

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
