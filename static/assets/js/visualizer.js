import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let analyser, audioContext, source;
let dataArray = new Float32Array(128);
let time = 0;

// Массив для хранения следов
let trailPoints = [];
let trailGeometry, trailMaterial, trailLine;
let trailUpdateCounter = 0;
const TRAIL_UPDATE_INTERVAL = 10; // Обновляем след каждые 10 кадров

// Массив для хранения квадратиков с данными
let dataSquares = [];
let squareGroup;

// Сфера
let sphere;

export async function startVisualizer(container) {
  try {
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);

    // Камера
    camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.set(50, 50, 50);

    // Рендерер
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Управление камерой
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Создаем оси координат
    createAxes();
    
    // Создаем сферу
    createSphere();
    
    // Создаем систему следов
    createTrailSystem();
    
    // Создаем группу для квадратиков с данными
    createDataSquaresGroup();

    // Аудио
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      dataArray = new Float32Array(analyser.frequencyBinCount);
      source.connect(analyser);
      
      if (window.updateAudioInfo) {
        window.updateAudioInfo('Активно', 0, 0);
      }
    } catch (e) {
      console.error('Микрофон недоступен:', e);
      createAudioSimulation();
      
      if (window.updateAudioInfo) {
        window.updateAudioInfo('Симуляция', 0, 0);
      }
    }

    // Обработчик изменения размера
    window.addEventListener('resize', () => {
      const ww = container.clientWidth;
      const hh = container.clientHeight;
      
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      renderer.setSize(ww, hh);
    });

    animate();
    
  } catch (error) {
    console.error('Ошибка инициализации визуализации:', error);
    container.innerHTML = `
      <div style="color: white; text-align: center; padding: 2rem;">
        <h3>Ошибка загрузки визуализации</h3>
        <p>${error.message}</p>
        <p>Проверьте консоль браузера для деталей</p>
      </div>
    `;
  }
}

function createAxes() {
  const axisLength = 100;
  const axisWidth = 2;
  
  // Ось X (красная) - отвечает за низкие частоты
  const xAxisGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
  const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
  xAxis.rotation.z = Math.PI / 2;
  xAxis.position.x = axisLength / 2;
  scene.add(xAxis);
  
  // Ось Y (зеленая) - отвечает за средние частоты
  const yAxisGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
  const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
  yAxis.position.y = axisLength / 2;
  scene.add(yAxis);
  
  // Ось Z (синяя) - отвечает за высокие частоты
  const zAxisGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
  const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0080ff });
  const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = axisLength / 2;
  scene.add(zAxis);
  
  // Добавляем подписи к осям
  const labelGeometry = new THREE.BoxGeometry(10, 10, 10);
  const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
  const xLabel = new THREE.Mesh(labelGeometry, labelMaterial);
  xLabel.position.set(axisLength + 10, 0, 0);
  scene.add(xLabel);
  
  const yLabel = new THREE.Mesh(labelGeometry, labelMaterial);
  yLabel.position.set(0, axisLength + 10, 0);
  scene.add(yLabel);
  
  const zLabel = new THREE.Mesh(labelGeometry, labelMaterial);
  zLabel.position.set(0, 0, axisLength + 10);
  scene.add(zLabel);
}

function createSphere() {
  const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
  const sphereMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x6e8efb,
    shininess: 100,
    emissive: 0x6e8efb,
    emissiveIntensity: 0.2
  });
  
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, 0);
  scene.add(sphere);
}

function createTrailSystem() {
  trailGeometry = new THREE.BufferGeometry();
  trailMaterial = new THREE.LineBasicMaterial({ 
    color: 0x6e8efb,
    transparent: true,
    opacity: 0.7
  });
  
  trailLine = new THREE.Line(trailGeometry, trailMaterial);
  scene.add(trailLine);
}

function createDataSquaresGroup() {
  squareGroup = new THREE.Group();
  scene.add(squareGroup);
}

function createDataSquare(position, audioData) {
  // Создаем квадратик с данными звука
  const squareGeometry = new THREE.PlaneGeometry(8, 8);
  
  // Цвет квадратика зависит от интенсивности звука
  const intensity = (audioData.low + audioData.mid + audioData.high) / 3;
  const color = new THREE.Color().setHSL(intensity * 0.3, 0.8, 0.5);
  
  const squareMaterial = new THREE.MeshBasicMaterial({ 
    color: color,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  
  const square = new THREE.Mesh(squareGeometry, squareMaterial);
  square.position.copy(position);
  
  // Поворачиваем квадратик к камере
  square.lookAt(camera.position);
  
  // Добавляем в группу
  squareGroup.add(square);
  
  // Удаляем квадратик через некоторое время
  setTimeout(() => {
    if (squareGroup.children.includes(square)) {
      squareGroup.remove(square);
    }
  }, 3000);
}

function createAudioSimulation() {
  setInterval(() => {
    for (let i = 0; i < 128; i++) {
      dataArray[i] = Math.random() * 0.5 + 0.5;
    }
  }, 100);
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  // Обновляем аудио данные
  if (analyser) {
    analyser.getFloatFrequencyData(dataArray);
    // Преобразуем в положительные значения
    for (let i = 0; i < dataArray.length; i++) {
      dataArray[i] = (dataArray[i] + 140) / 140;
      dataArray[i] = Math.max(0, Math.min(1, dataArray[i]));
    }
  }

  // Анализируем частоты
  const lowFreq = getFrequencyBand(0, 4);    // Низкие частоты (бас)
  const midFreq = getFrequencyBand(5, 24);   // Средние частоты
  const highFreq = getFrequencyBand(25, 63); // Высокие частоты

  // Вычисляем общую интенсивность
  const totalIntensity = (lowFreq + midFreq + highFreq) / 3;

  // Обновляем позицию сферы
  const targetX = lowFreq * 80 - 40;   // X ось - низкие частоты
  const targetY = midFreq * 80 - 40;   // Y ось - средние частоты  
  const targetZ = highFreq * 80 - 40;  // Z ось - высокие частоты

  // Плавно перемещаем сферу
  sphere.position.x += (targetX - sphere.position.x) * 0.1;
  sphere.position.y += (targetY - sphere.position.y) * 0.1;
  sphere.position.z += (targetZ - sphere.position.z) * 0.1;

  // Обновляем след
  trailUpdateCounter++;
  if (trailUpdateCounter >= TRAIL_UPDATE_INTERVAL) {
    trailUpdateCounter = 0;
    
    // Добавляем новую точку в след
    trailPoints.push(sphere.position.clone());
    
    // Ограничиваем длину следа
    if (trailPoints.length > 50) {
      trailPoints.shift();
    }
    
    // Обновляем геометрию следа
    if (trailPoints.length > 1) {
      trailGeometry.setFromPoints(trailPoints);
      trailGeometry.attributes.position.needsUpdate = true;
    }
  }

  // Создаем квадратик с данными при достижении пика
  if (totalIntensity > 0.7 && Math.random() > 0.95) {
    createDataSquare(sphere.position.clone(), {
      low: lowFreq,
      mid: midFreq,
      high: highFreq
    });
  }

  // Вращаем пространство
  scene.rotation.y += 0.002;
  scene.rotation.x += 0.001;

  // Обновляем информацию об аудио
  if (window.updateAudioInfo) {
    const status = analyser ? 'Активно' : 'Симуляция';
    const dominantFreq = Math.max(lowFreq, midFreq, highFreq) * 20000; // Примерная частота в Hz
    window.updateAudioInfo(status, totalIntensity, dominantFreq);
  }

  // Обновляем элементы управления
  if (controls) {
    controls.update();
  }

  // Рендеринг
  renderer.render(scene, camera);
}

function getFrequencyBand(start, end) {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += dataArray[i] || 0;
  }
  return sum / (end - start + 1);
}
