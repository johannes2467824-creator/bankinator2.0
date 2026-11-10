
/* PHONE SCALING */

function fitPhoneToScreen() {
  const phone = document.getElementById('phone');
  if (window.innerWidth <= 600) {
    phone.style.setProperty('--phone-scale', 1);
    return;
  }

  const scale = Math.min(
    (window.innerWidth - 50) / 390,
    (window.innerHeight - 50) / 844,
    1
  );

  phone.style.setProperty('--phone-scale', Math.max(.1, scale));
}

window.addEventListener('resize', fitPhoneToScreen);
fitPhoneToScreen();

/* NAVIGATION */

const phoneScreen = document.getElementById('phoneScreen');
const overlay = document.getElementById('overlay');
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2300);
}

document.getElementById('openId').addEventListener('click', () => {
  overlay.classList.add('open');
  prepareScreenCapture();
});

function closeCard() {
  stopPixelation();
  overlay.classList.remove('open');
}

document.getElementById('closeId').addEventListener('click', closeCard);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeCard();
});

document.getElementById('scan').addEventListener('click', () => {
  showToast('QR-skanning kommer senare');
});

document.getElementById('menu').addEventListener('click', () => {
  showToast('Meny kommer senare');
});

document.getElementById('more').addEventListener('click', () => {
  showToast('BLY Demo');
});

/* 32 ANIMATED DEFORMED SECURITY LINES */

{
  const clockwise = document.getElementById('clockwiseLines');
  const counterclockwise = document.getElementById('counterclockwiseLines');

  const colors = [
    '#e5a4ce',
    '#a4d7e1',
    '#b4b5df',
    '#b6d4d0'
  ];

  function addLine(group, index, reverse) {
    const path = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );

    const points = [];
    const baseRadius = 25 + index * 20;

    for (let j = 0; j <= 240; j++) {
      const angle = (j / 240) * Math.PI * 2;

      const deformation =
        Math.sin(angle * 2 + 0.5) * 0.15 +
        Math.sin(angle * 3 - 0.9) * 0.10 +
        Math.cos(angle * 5 + 0.8) * 0.06 +
        Math.sin(angle * 8 - 1.5) * 0.025;

      const variation =
        Math.sin(angle * 4 + index * 0.12) * 2;

      const radius =
        baseRadius * (1 + deformation) + variation;

      const x =
        210 + Math.cos(angle) * radius * 1.08;

      const y =
        380 + Math.sin(angle) * radius * 1.17;

      points.push(
        `${j === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      );
    }

    path.setAttribute('d', points.join(' ') + ' Z');
    path.setAttribute('fill', 'none');

    path.setAttribute(
      'stroke',
      colors[(index + (reverse ? 2 : 0)) % colors.length]
    );

    path.setAttribute('stroke-width', '0.85');
    path.setAttribute('opacity', reverse ? '0.5' : '0.65');

    group.appendChild(path);
  }

  for (let i = 0; i < 32; i++) {
    addLine(clockwise, i, false);
    addLine(counterclockwise, i, true);
  }
}

/* PIXEL CENSOR */

const pixelPatch = document.getElementById('pixelPatch');
const pixelCanvas = document.getElementById('pixelCanvas');
const pixelCtx = pixelCanvas.getContext('2d', { alpha: true });

const PIXEL_DIAMETER = 180;
const HOLD_BLOCK_SIZE = 50;
const RESTORE_DURATION = 380;

pixelCanvas.width = PIXEL_DIAMETER;
pixelCanvas.height = PIXEL_DIAMETER;

const pixelBuffer = document.createElement('canvas');
const pixelBufferCtx = pixelBuffer.getContext('2d', { alpha: true });

// The element must be the SAME size as its canvas.
// This overrides any old 140px width/height in style.css.
pixelPatch.style.width = PIXEL_DIAMETER + 'px';
pixelPatch.style.height = PIXEL_DIAMETER + 'px';

// A permanent, square-edged circular mask. Each opaque tile is
// one large pixel; there is NO smooth circular clipping path.
const pixelMask = document.createElement('canvas');
pixelMask.width = PIXEL_DIAMETER;
pixelMask.height = PIXEL_DIAMETER;
const maskCtx = pixelMask.getContext('2d');
const edgeCells = Math.round(PIXEL_DIAMETER / HOLD_BLOCK_SIZE);
const edgeCellSize = PIXEL_DIAMETER / edgeCells;
const maskRadius = PIXEL_DIAMETER / 2;

maskCtx.fillStyle = '#ffffff';
for (let row = 0; row < edgeCells; row++) {
  for (let col = 0; col < edgeCells; col++) {
    const centerX = (col + 0.5) * edgeCellSize;
    const centerY = (row + 0.5) * edgeCellSize;
    const dx = centerX - maskRadius;
    const dy = centerY - maskRadius;

    if (dx * dx + dy * dy <= maskRadius * maskRadius) {
      maskCtx.fillRect(
        col * edgeCellSize,
        row * edgeCellSize,
        edgeCellSize,
        edgeCellSize
      );
    }
  }
}

let screenSnapshot = null;
let captureVersion = 0;
let capturePromise = null;
let pixelActive = false;
let activePointerId = null;
let pixelX = 0;
let pixelY = 0;
let restoreFrame = null;
let drawPending = false;

/* CAPTURE ID WITHOUT THE PHONE'S CSS TRANSFORM */

async function prepareScreenCapture() {
  if (screenSnapshot) return screenSnapshot;
  if (capturePromise) return capturePromise;

  const version = ++captureVersion;
  const width = overlay.clientWidth;
  const height = overlay.clientHeight;

  const promise = (async () => {
    if (typeof html2canvas !== 'function') {
      console.error('html2canvas could not load');
      return null;
    }

    await Promise.all(
      Array.from(overlay.querySelectorAll('img')).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })
    );

    await new Promise(resolve => requestAnimationFrame(resolve));

    const snapshot = await html2canvas(overlay, {
      backgroundColor: '#193d4e',
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      height,
      windowWidth: Math.max(window.innerWidth, width),
      windowHeight: Math.max(window.innerHeight, height),
      scrollX: 0,
      scrollY: 0,
      onclone: clonedDocument => {
        const clonedOverlay = clonedDocument.getElementById('overlay');
        const clonedPatch = clonedDocument.getElementById('pixelPatch');
        if (clonedPatch) clonedPatch.style.display = 'none';
        if (!clonedOverlay) return;
        clonedDocument.documentElement.style.overflow = 'visible';
        clonedDocument.body.style.overflow = 'visible';

        // Screenshot the ID at its own (0, 0), not at the
        // position of the scaled/translated phone on the page.
        clonedDocument.body.appendChild(clonedOverlay);
        Object.assign(clonedOverlay.style, {
          position: 'fixed',
          left: '0px',
          top: '0px',
          right: 'auto',
          bottom: 'auto',
          width: width + 'px',
          height: height + 'px',
          transform: 'none',
          margin: '0',
          display: 'block',
          visibility: 'visible'
        });
      }
    });

    if (version !== captureVersion) return null;
    screenSnapshot = snapshot;
    if (pixelActive) requestPixelDraw();
    return snapshot;
  })();

  capturePromise = promise;
  try {
    return await promise;
  } catch (error) {
    console.error('Screen capture failed:', error);
    return null;
  } finally {
    if (capturePromise === promise) capturePromise = null;
  }
}

/* POINTER POSITION: THE PATCH IS POSITIONED INSIDE phoneScreen */

function getPhonePosition(clientX, clientY) {
  const rect = phoneScreen.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * phoneScreen.clientWidth / rect.width,
    y: (clientY - rect.top) * phoneScreen.clientHeight / rect.height
  };
}

function positionPixelPatch() {
  pixelPatch.style.left = pixelX + 'px';
  pixelPatch.style.top = pixelY + 'px';
}

/* PIXELATE THE AREA ACTUALLY BEHIND THE CIRCLE */

function drawPixelation(blockSize) {
  if (!screenSnapshot) return;

  const size = PIXEL_DIAMETER;
  const resolution = Math.max(1, Math.round(size / Math.max(1, blockSize)));
  if (pixelBuffer.width !== resolution || pixelBuffer.height !== resolution) {
    pixelBuffer.width = resolution;
    pixelBuffer.height = resolution;
  }

  // Both rectangles are measured in the SAME viewport coordinates.
  // This accounts for the phone's translate/scale and the circle's
  // translate(-50%, -50%) without guessing any offsets.
  const circleRect = pixelPatch.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const scaleX = screenSnapshot.width / overlayRect.width;
  const scaleY = screenSnapshot.height / overlayRect.height;
  const sourceX = (circleRect.left - overlayRect.left) * scaleX;
  const sourceY = (circleRect.top - overlayRect.top) * scaleY;
  const sourceWidth = circleRect.width * scaleX;
  const sourceHeight = circleRect.height * scaleY;

  pixelBufferCtx.clearRect(0, 0, resolution, resolution);
  pixelBufferCtx.fillStyle = '#193d4e';
  pixelBufferCtx.fillRect(0, 0, resolution, resolution);

  // Clip at screen edges rather than stretching the cropped image.
  const x1 = Math.max(0, sourceX);
  const y1 = Math.max(0, sourceY);
  const x2 = Math.min(screenSnapshot.width, sourceX + sourceWidth);
  const y2 = Math.min(screenSnapshot.height, sourceY + sourceHeight);

  if (x2 > x1 && y2 > y1) {
    const dx = (x1 - sourceX) / sourceWidth * resolution;
    const dy = (y1 - sourceY) / sourceHeight * resolution;
    const dw = (x2 - x1) / sourceWidth * resolution;
    const dh = (y2 - y1) / sourceHeight * resolution;
    pixelBufferCtx.imageSmoothingEnabled = true;
    pixelBufferCtx.drawImage(
      screenSnapshot, x1, y1, x2 - x1, y2 - y1,
      dx, dy, dw, dh
    );
  }

  // Draw big pixel squares over the whole canvas.
  pixelCtx.clearRect(0, 0, size, size);
  pixelCtx.imageSmoothingEnabled = false;
  pixelCtx.drawImage(pixelBuffer, 0, 0, size, size);

  // Remove every pixel outside the staircase-shaped circle.
  // The transparent corners stay transparent; no square overlay.
  pixelCtx.globalCompositeOperation = 'destination-in';
  pixelCtx.drawImage(pixelMask, 0, 0);
  pixelCtx.globalCompositeOperation = 'source-over';
}

function requestPixelDraw() {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(() => {
    drawPending = false;
    if (!pixelActive || !screenSnapshot) return;
    positionPixelPatch();
    drawPixelation(HOLD_BLOCK_SIZE);
    pixelPatch.classList.add('visible');
  });
}

function stopPixelation() {
  pixelActive = false;
  activePointerId = null;
  captureVersion++;
  capturePromise = null;
  if (restoreFrame !== null) {
    cancelAnimationFrame(restoreFrame);
    restoreFrame = null;
  }
  pixelPatch.classList.remove('visible');
  pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
  screenSnapshot = null;
}

/* PRESS, MOVE AND RELEASE */

overlay.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  if (pixelActive) return;

  if (restoreFrame !== null) {
    cancelAnimationFrame(restoreFrame);
    restoreFrame = null;
  }

  pixelActive = true;
  activePointerId = event.pointerId;
  const pos = getPhonePosition(event.clientX, event.clientY);
  pixelX = pos.x;
  pixelY = pos.y;
  positionPixelPatch();

  try {
    overlay.setPointerCapture(event.pointerId);
  } catch (error) {}

  if (screenSnapshot) requestPixelDraw();
  else prepareScreenCapture();
});

overlay.addEventListener('pointermove', event => {
  if (!pixelActive || event.pointerId !== activePointerId) return;
  const pos = getPhonePosition(event.clientX, event.clientY);
  pixelX = pos.x;
  pixelY = pos.y;
  positionPixelPatch();
  requestPixelDraw();
});


function releasePixelation() {
  if (!pixelActive) return;

  pixelActive = false;
  activePointerId = null;

  if (restoreFrame !== null) {
    cancelAnimationFrame(restoreFrame);
    restoreFrame = null;
  }

  // Instantly hide the pixelated circle
  pixelPatch.classList.remove('visible');

  // Clear all pixels immediately
  pixelCtx.clearRect(
    0,
    0,
    pixelCanvas.width,
    pixelCanvas.height
  );
}


overlay.addEventListener('pointerup', event => {
  if (event.pointerId === activePointerId) releasePixelation();
});

overlay.addEventListener('pointercancel', event => {
  if (event.pointerId === activePointerId) releasePixelation();
});

window.addEventListener('blur', () => {
  pixelActive = false;
  activePointerId = null;
  if (restoreFrame !== null) {
    cancelAnimationFrame(restoreFrame);
    restoreFrame = null;
  }
  pixelPatch.classList.remove('visible');
});

/* CLICK, SLIDE AND RELEASE SOUNDS */

(() => {
  const clickSound = new Audio("./assets/audio/click.mp3");
  const slideSound = new Audio("./assets/audio/slide.mp3");
  const releaseSound = new Audio("./assets/audio/release.mp3");

  slideSound.loop = true;
  slideSound.preload = "auto";
  releaseSound.preload = "auto";
  clickSound.preload = "auto";

  let holding = false;
  let sliding = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let soundTimer = null;

  function playAudio(audio) {
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.error("Audio error:", audio.src, error);
    });
  }

  document.addEventListener("pointerdown", e => {
    const overlay = document.querySelector(".overlay");
    if (!overlay) return;

    const style = getComputedStyle(overlay);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) return;

    const rect = overlay.getBoundingClientRect();

    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) return;

    if (e.target.closest(".close")) return;

    holding = true;
    sliding = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;

    clearTimeout(soundTimer);

    slideSound.pause();
    slideSound.currentTime = 0;
    slideSound.volume = 0;

    slideSound.play().catch(error => {
      console.error("Slide error:", error);
    });

    soundTimer = setTimeout(() => {
      if (holding && sliding) {
        slideSound.volume = 1;
      }
    }, 250);
  }, true);

  document.addEventListener("pointermove", e => {
    if (!holding || e.pointerId !== pointerId) return;

    const distance = Math.hypot(
      e.clientX - startX,
      e.clientY - startY
    );

    if (distance > 10 && !sliding) {
      sliding = true;
    }

    if (sliding) {
      slideSound.volume = 1;
    }
  }, true);

  function stopSound(e, cancelled = false) {
    if (!holding || e.pointerId !== pointerId) return;

    clearTimeout(soundTimer);

    slideSound.pause();
    slideSound.currentTime = 0;
    slideSound.volume = 0;

    if (!cancelled) {
      if (sliding) {
        playAudio(releaseSound);
      } else {
        playAudio(clickSound);
      }
    }

    holding = false;
    sliding = false;
    pointerId = null;
  }

  document.addEventListener("pointerup", e => {
    stopSound(e);
  }, true);

  document.addEventListener("pointercancel", e => {
    stopSound(e, true);
  }, true);

  console.log("BLY sound system loaded successfully");
})();

/* RANDOM QR CODE GENERATOR */

const qrContainer = document.getElementById("qrGenerator");

function generateRandomCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  const randomCode = Array.from(bytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("").toUpperCase();

  return "BLY-DEMO-" + randomCode;
}

const qrGenerator = new QRCode(qrContainer, {
  text: generateRandomCode(),
  width: 150,
  height: 150,
  colorDark: "#000000",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.M
});

setInterval(() => {
  qrGenerator.makeCode(generateRandomCode());
}, 1000);

/* QR COUNTDOWN - 20 SECONDS */

(() => {
  const overlay = document.querySelector(".overlay");
  const progress = document.getElementById("qrProgressFill");

  if (!overlay || !progress) return;

  let countdownTimer = null;
  let running = false;

  function isOverlayVisible() {
    const style = getComputedStyle(overlay);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0 &&
      overlay.getClientRects().length > 0
    );
  }

  function startCountdown() {
    clearTimeout(countdownTimer);

    progress.classList.remove("running");
    void progress.offsetWidth;
    progress.classList.add("running");

    countdownTimer = setTimeout(() => {
      if (!isOverlayVisible()) return;

      const closeButton =
        overlay.querySelector(".close") ||
        document.querySelector(".close");

      if (closeButton) {
        closeButton.click();
      } else {
        overlay.style.display = "none";
      }
    }, 20000);
  }

  function checkOverlay() {
    if (isOverlayVisible()) {
      if (!running) {
        running = true;
        startCountdown();
      }
    } else {
      running = false;
      clearTimeout(countdownTimer);
      progress.classList.remove("running");
    }
  }

  const observer = new MutationObserver(checkOverlay);

  observer.observe(overlay, {
    attributes: true,
    attributeFilter: ["class", "style", "hidden"]
  });

  checkOverlay();
})();
