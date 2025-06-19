/*
splash.js
.js for the splash page
*/

console.log("Splash page script loaded.");

// Add this near the top with other global state variables
let nutationStartTime = null;
let transitioningToCarousel = false;
let glowExpansionStartTime = null;

// Set up canvas for the sphere
const canvas = document.getElementById('sphereCanvas');
const ctx = canvas.getContext('2d');
const Tx_TO_CAROUSEL_PG_TIME = 7000

let width, height;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
resize();
window.addEventListener('resize', () => {
  resize();
  init();
});

// Multiple spheres for layered orbit effect
const spheres = [
  {
    radius: 250,
    dotCount: 300,
    rotationSpeed: 0.05,
    angle: 0,
    color: 'rgba(0, 255, 170, 0.8)',
    nutationRate: 0.015,
    nutationAngle: 0,
    precessionRate: 0.01,
    precessionAngle: 0,
  },
  {
    radius: 150,
    dotCount: 200,
    rotationSpeed: 0.032,
    angle: 0,
    color: 'rgba(0, 200, 255, 0.6)',
    nutationRate: 0.025,
    nutationAngle: 0,
    precessionRate: 0.02,
    precessionAngle: 0,
  }
];

let baseCenterY = 0;
let centerX = 0;

// Audio setup
let audioCtx;
let analyser;
let sourceNode;
let dataArray;
let bufferLength;
let audioPlaying = false;

const audioURL = '../assets/audio/muscle car power up.wav';

// Animation frame id for canceling animation loop
let animationFrameId;

// Nutation flag
let nutationEnabled = false;

// Smooth nutation start: initialize nutationAngle to current scale's phase
function initializeNutationAngles() {
  spheres.forEach(sphere => {
    const currentScale = 0.3; // static scale before nutation
    const target = (currentScale - 0.2) / 0.1;
    sphere.nutationAngle = Math.asin(Math.max(-1, Math.min(1, target)));
  });
}

// Missing playAudio function added here:
function playAudio() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  sourceNode.start(0);
  audioPlaying = true;
  nutationStartTime = performance.now(); // ← Track when nutation begins
}

async function setupAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const response = await fetch(audioURL);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    sourceNode.onended = () => {
      audioPlaying = false;
      console.log("Audio ended.");

      // Start glow-based transition
      transitioningToCarousel = true;
      glowExpansionStartTime = performance.now();
    };
  } catch (err) {
    console.error('Error setting up audio:', err);
  }
}

// Function to reset sphere angles to initial values
function resetSpheres() {
  spheres.forEach(sphere => {
    sphere.angle = 0;
  });
}

// Color cycling & opacity pulse angles
let colorCycleAngle = 0;
let opacityPulseAngle = 0;

// Draw the central scribble with glowing gradient
function drawStaticScribble(centerX, centerY) {
  const lines = 70;
  let radius = 70;
  let glowAlpha = 0.15;

  let fadeFactor = 0; // Fade factor from 0 (no fade) to 1 (fully faded)

  if (transitioningToCarousel && glowExpansionStartTime) {
    const elapsed = (performance.now() - glowExpansionStartTime) / 1000;

    // Expand radius and brighten glow
    radius += elapsed * 600;
    glowAlpha = Math.min(1, 0.15 + elapsed * 1.2);

    // Calculate fade factor as radius expands from 70 to max screen dimension
    fadeFactor = Math.min(1, (radius - 70) / Math.max(width, height));

    // If the glow fills the screen, redirect
    if (radius >= Math.max(width, height)) {
      window.location.href = "./pages/carousel.html";
      return;
    }
  }

  // Color cycling independent of audio
  colorCycleAngle = (colorCycleAngle + 1) % 360;
  const hue = colorCycleAngle;

  // Sinusoidal opacity pulsing
  opacityPulseAngle += 0.02;
  const baseAlpha = glowAlpha + (Math.sin(opacityPulseAngle) * 0.15 + 0.15); // Range ~0.15–0.45

  // Glow strength from audio (additive to base)
  let glowStrength = 0.0;
  if (analyser && dataArray && audioPlaying) {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    glowStrength = Math.min(1, avg / 100);
  }

  const finalAlpha = Math.min(0.6, baseAlpha + glowStrength * 0.8);
  const outerRadius = radius * 2.0;

  // Aura opacity fades with fadeFactor
  const auraAlpha = finalAlpha * (1 - fadeFactor);

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius);
  gradient.addColorStop(0.0, `hsla(${hue}, 100%, 70%, ${auraAlpha})`);
  gradient.addColorStop(0.4, `hsla(${hue}, 100%, 60%, ${auraAlpha * 0.6})`);
  gradient.addColorStop(1.0, `hsla(${hue}, 100%, 60%, 0)`);

  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Fade inner scribble lines color from teal to black based on fadeFactor
  // Original rgba(0,255,170,0.8)
  const baseR = 0, baseG = 255, baseB = 170;
  // Interpolated color components
  const r = Math.round(baseR * (1 - fadeFactor));
  const g = Math.round(baseG * (1 - fadeFactor));
  const b = Math.round(baseB * (1 - fadeFactor));
  // Alpha fades from 0.8 to 0
  const alpha = 0.8 * (1 - fadeFactor);

  ctx.beginPath();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.lineWidth = 2;

  for (let i = 0; i < lines; i++) {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const r1 = Math.random() * radius * 0.5;
    const r2 = Math.random() * radius * 0.5;

    const x1 = centerX + r1 * Math.cos(angle1);
    const y1 = centerY + r1 * Math.sin(angle1);
    const x2 = centerX + r2 * Math.cos(angle2);
    const y2 = centerY + r2 * Math.sin(angle2);

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }

  ctx.stroke();
}

// Frequency-to-color (iridis style)
function iridisColor(norm) {
  norm = Math.min(1, Math.max(0, norm));
  const r = Math.round(255 * Math.min(1.5 * (1 - norm), 1));
  const g = Math.round(255 * Math.pow(norm, 0.5));
  const b = Math.round(255 * norm);
  return `rgb(${r}, ${g}, ${b})`;
}

// Draw frequency-reactive radial scribbles
function drawFrequencyScribbles(centerX, centerY) {
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  const maxLines = 50;
  const angleStep = (Math.PI * 2) / maxLines;
  const maxLength = 220;

  for (let i = 0; i < maxLines; i++) {
    const freqIndex = Math.floor((i / maxLines) * bufferLength);
    const amplitude = dataArray[freqIndex] / 255;
    const length = amplitude * maxLength;

    const angle = i * angleStep + Math.random() * 0.05;
    const x1 = centerX + Math.cos(angle) * 10;
    const y1 = centerY + Math.sin(angle) * 10;
    const x2 = centerX + Math.cos(angle) * (10 + length);
    const y2 = centerY + Math.sin(angle) * (10 + length);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = iridisColor(i / maxLines);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// Main draw function for all orbiting rings
function drawSphere(time) {
  ctx.clearRect(0, 0, width, height);

  const centerY = baseCenterY + Math.sin(time * 0.005) * 30;

  let nutationElapsedSec = 0;
  if (nutationEnabled && nutationStartTime !== null) {
    nutationElapsedSec = (performance.now() - nutationStartTime) / 1000;
  }

  spheres.forEach(sphere => {
    const { radius, dotCount, angle, rotationSpeed, color, nutationRate } = sphere;

    if (nutationEnabled) {
      const rateBoost = 1 + nutationElapsedSec * 0.75;
      sphere.nutationAngle += nutationRate * rateBoost;
      sphere.precessionAngle += sphere.precessionRate * rateBoost;
      // Multiply rotationSpeed by rateBoost so rotation speeds up with nutation
      sphere.angle += rotationSpeed * rateBoost;
      
    }

    const nutation = nutationEnabled
      ? 0.2 + 0.1 * Math.sin(sphere.nutationAngle)
      : 0.3;

    for (let i = 0; i < dotCount; i++) {
      const theta = (i / dotCount) * 2 * Math.PI + angle;
      const x = centerX + radius * Math.cos(theta);
      const y = centerY + radius * Math.sin(theta) * nutation;

      const size = 3 + Math.sin(theta * 3 + angle) * 2;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }

    sphere.angle += rotationSpeed;
  });

  drawStaticScribble(centerX, centerY);
  drawFrequencyScribbles(centerX, centerY);
}

function animate(time = 0) {
  drawSphere(time / 1000);
  animationFrameId = requestAnimationFrame(animate);
}

function init() {
  baseCenterY = height / 2 - 80;
  centerX = width / 2;
}

// Initialize
init();
animate();

// Button click handler
enterBtn.addEventListener('click', async () => {
  if (!audioPlaying) {
    await setupAudio();
    playAudio();

    initializeNutationAngles();
    nutationEnabled = true;

    enterBtn.disabled = true;
    enterBtn.textContent = "Playing...";
  }
});

// Change button text on hover ONLY if button is NOT disabled
enterBtn.addEventListener('mouseenter', () => {
  if (!enterBtn.disabled) {
    // Save original text if not saved already
    if (!enterBtn.dataset.originalText) {
      enterBtn.dataset.originalText = enterBtn.textContent;
    }
    enterBtn.textContent = '<press enter>';
  }
});

enterBtn.addEventListener('mouseleave', () => {
  if (!enterBtn.disabled && enterBtn.dataset.originalText) {
    enterBtn.textContent = enterBtn.dataset.originalText;
  }
});

