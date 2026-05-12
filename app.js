const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
const clearTargetBtn = document.getElementById("clearTargetBtn");
const startTrackingBtn = document.getElementById("startTrackingBtn");
const requestOrientationBtn = document.getElementById("requestOrientationBtn");
const testSoundBtn = document.getElementById("testSoundBtn");
const centerMapBtn = document.getElementById("centerMapBtn");

const scanStatus = document.getElementById("scanStatus");
const permissionStatus = document.getElementById("permissionStatus");
const proximityStatus = document.getElementById("proximityStatus");
const distanceText = document.getElementById("distanceText");
const headingText = document.getElementById("headingText");
const bearingText = document.getElementById("bearingText");
const targetText = document.getElementById("targetText");
const currentText = document.getElementById("currentText");
const hint = document.getElementById("hint");
const reader = document.getElementById("reader");
const arrow = document.getElementById("arrow");
const arrowGlow = document.getElementById("arrowGlow");

let map;
let userMarker = null;
let targetMarker = null;
let accuracyCircle = null;
let targetRadiusCircle = null;
let lineToTarget = null;

let html5QrCode = null;
let scannerRunning = false;

let watchId = null;
let targetCoords = loadSavedTarget();
let currentCoords = null;
let currentHeading = null;
let targetReachedBeepPlayed = false;
let nearTargetBeepPlayed = false;
let audioContext = null;

initMap();
bindEvents();
registerServiceWorker();
updateStaticUI();
restoreTargetIfAvailable();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.error("Service Worker Registrierung fehlgeschlagen:", error);
    }
  });
}

function initMap() {
  map = L.map("map").setView([47.3769, 8.5417], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap-Mitwirkende",
  }).addTo(map);
}

function bindEvents() {
  startScanBtn.addEventListener("click", startScanner);
  stopScanBtn.addEventListener("click", stopScanner);
  clearTargetBtn.addEventListener("click", clearTarget);
  startTrackingBtn.addEventListener("click", startLocationTracking);
  requestOrientationBtn.addEventListener("click", requestOrientationPermission);
  testSoundBtn.addEventListener("click", () => playBeep(880, 180, 0.05));
  centerMapBtn.addEventListener("click", () => fitMapToAvailablePoints(true));

  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

function updateStaticUI() {
  distanceText.textContent = "–";
  headingText.textContent = "–";
  bearingText.textContent = "–";
  currentText.textContent = "–";

  if (targetCoords) {
    targetText.textContent = `${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
    proximityStatus.textContent = "Gespeichertes Ziel aktiv.";
  } else {
    targetText.textContent = "–";
    proximityStatus.textContent = "Noch kein Ziel aktiv.";
  }
}

function restoreTargetIfAvailable() {
  if (!targetCoords) return;

  updateTargetMarker();
  fitMapToAvailablePoints(true);
  scanStatus.textContent =
    `Gespeichertes Ziel geladen: ${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
}

async function startScanner() {
  if (scannerRunning) return;

  reader.classList.remove("hidden");
  scanStatus.textContent = "Starte Kamera…";
  html5QrCode = new Html5Qrcode("reader");

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.72;
          return { width: size, height: size };
        },
      },
      onScanSuccess,
      () => {}
    );

    scannerRunning = true;
    startScanBtn.disabled = true;
    stopScanBtn.disabled = false;
    scanStatus.textContent = "Scanner aktiv. Bitte QR-Code ins Kamerabild halten.";
  } catch (error) {
    scanStatus.textContent = `Scanner konnte nicht gestartet werden: ${error}`;
    reader.classList.add("hidden");
  }
}

async function stopScanner() {
  if (!html5QrCode || !scannerRunning) return;

  try {
    await html5QrCode.stop();
    await html5QrCode.clear();
  } catch (_) {
  } finally {
    scannerRunning = false;
    startScanBtn.disabled = false;
    stopScanBtn.disabled = true;
    reader.classList.add("hidden");
    scanStatus.textContent = "Scanner gestoppt.";
  }
}

async function onScanSuccess(decodedText) {
  const parsed = parseCoordinates(decodedText);

  if (!parsed) {
    scanStatus.textContent = `QR-Code erkannt, aber ungültiges Format: ${decodedText}`;
    return;
  }

  targetCoords = parsed;
  saveTarget(targetCoords);
  targetReachedBeepPlayed = false;
  nearTargetBeepPlayed = false;

  targetText.textContent = `${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
  proximityStatus.textContent = "Ziel erfolgreich geladen.";
  scanStatus.textContent =
    `Ziel erkannt: ${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;

  updateTargetMarker();
  updateNavigation();
  fitMapToAvailablePoints(true);

  await stopScanner();
}

function clearTarget() {
  targetCoords = null;
  targetReachedBeepPlayed = false;
  nearTargetBeepPlayed = false;

  localStorage.removeItem("rehkitz-target");

  if (targetMarker) {
    map.removeLayer(targetMarker);
    targetMarker = null;
  }

  if (targetRadiusCircle) {
    map.removeLayer(targetRadiusCircle);
    targetRadiusCircle = null;
  }

  if (lineToTarget) {
    map.removeLayer(lineToTarget);
    lineToTarget = null;
  }

  targetText.textContent = "–";
  distanceText.textContent = "–";
  bearingText.textContent = "–";
  proximityStatus.textContent = "Noch kein Ziel aktiv.";
  proximityStatus.style.color = "";
  hint.textContent = "Bitte QR-Code scannen, um ein neues Ziel zu setzen.";
  scanStatus.textContent = "Ziel gelöscht. Du kannst jetzt neu scannen.";
  arrow.style.transform = "translate(-50%, -76%) rotate(0deg)";
  applyArrowColor("rgb(59, 130, 246)");

  if (currentCoords) {
    map.setView([currentCoords.lat, currentCoords.lng], 18);
  } else {
    map.setView([47.3769, 8.5417], 16);
  }
}

function parseCoordinates(text) {
  const clean = text.trim();

  let match = clean.match(
    /(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)/i
  );

  if (!match) {
    match = clean.match(/geo:\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i);
  }

  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function startLocationTracking() {
  if (!navigator.geolocation) {
    permissionStatus.textContent = "Geolocation wird von diesem Browser nicht unterstützt.";
    return;
  }

  if (watchId !== null) {
    permissionStatus.textContent = "Standortverfolgung läuft bereits.";
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      currentCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      currentText.textContent =
        `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)} (±${Math.round(currentCoords.accuracy)} m)`;

      permissionStatus.textContent = "Standort aktiv.";
      updateUserMarker();
      updateNavigation();
      fitMapToAvailablePoints(false);
    },
    (error) => {
      permissionStatus.textContent = `Standortfehler: ${error.message}`;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    }
  );
}

async function requestOrientationPermission() {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result === "granted") {
        permissionStatus.textContent =
          "Kompass freigegeben. Bitte Gerät möglichst waagrecht halten.";
      } else {
        permissionStatus.textContent = "Kompass-Berechtigung wurde nicht erteilt.";
      }
    } else {
      permissionStatus.textContent =
        "Kompass ist aktiv oder benötigt keine separate Freigabe.";
    }
  } catch (error) {
    permissionStatus.textContent = `Kompassfreigabe fehlgeschlagen: ${error.message}`;
  }
}

function handleOrientation(event) {
  let heading = null;

  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === "number") {
    heading = 360 - event.alpha;
  }

  if (heading === null || Number.isNaN(heading)) return;

  currentHeading = normalizeDegrees(heading);
  headingText.textContent = `${Math.round(currentHeading)}°`;
  updateNavigation();
}

function updateTargetMarker() {
  if (!targetCoords) return;

  if (!targetMarker) {
    targetMarker = L.marker([targetCoords.lat, targetCoords.lng]).addTo(map);
  } else {
    targetMarker.setLatLng([targetCoords.lat, targetCoords.lng]);
  }

  if (!targetRadiusCircle) {
    targetRadiusCircle = L.circle([targetCoords.lat, targetCoords.lng], {
      radius: 20,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);
  } else {
    targetRadiusCircle.setLatLng([targetCoords.lat, targetCoords.lng]);
    targetRadiusCircle.setRadius(20);
  }

  targetMarker.bindPopup("Zielpunkt");
}

function updateUserMarker() {
  if (!currentCoords) return;

  if (!userMarker) {
    userMarker = L.marker([currentCoords.lat, currentCoords.lng]).addTo(map);
  } else {
    userMarker.setLatLng([currentCoords.lat, currentCoords.lng]);
  }

  if (!accuracyCircle) {
    accuracyCircle = L.circle([currentCoords.lat, currentCoords.lng], {
      radius: currentCoords.accuracy,
      color: "#60a5fa",
      fillColor: "#60a5fa",
      fillOpacity: 0.08,
      weight: 2,
    }).addTo(map);
  } else {
    accuracyCircle.setLatLng([currentCoords.lat, currentCoords.lng]);
    accuracyCircle.setRadius(currentCoords.accuracy);
  }
}

function updateNavigation() {
  if (!targetCoords || !currentCoords) {
    if (!targetCoords) {
      hint.textContent = "Bitte zuerst einen QR-Code mit Zielkoordinaten scannen.";
      proximityStatus.textContent = "Noch kein Ziel aktiv.";
      proximityStatus.style.color = "";
    } else {
      hint.textContent = "Ziel ist gesetzt. Bitte jetzt den Standort aktivieren.";
      proximityStatus.textContent = "Ziel vorhanden, Position fehlt noch.";
      proximityStatus.style.color = "#93c5fd";
    }

    distanceText.textContent = "–";
    bearingText.textContent = "–";
    updateTargetLine();
    return;
  }

  const distance = haversineDistance(
    currentCoords.lat,
    currentCoords.lng,
    targetCoords.lat,
    targetCoords.lng
  );

  const targetBearing = calculateBearing(
    currentCoords.lat,
    currentCoords.lng,
    targetCoords.lat,
    targetCoords.lng
  );

  distanceText.textContent = formatDistance(distance);
  bearingText.textContent = `${Math.round(targetBearing)}°`;

  const rotation =
    currentHeading === null
      ? targetBearing
      : normalizeDegrees(targetBearing - currentHeading);

  arrow.style.transform = `translate(-50%, -76%) rotate(${rotation}deg)`;

  const color = getProximityColor(distance);
  applyArrowColor(color);
  updateProximityText(distance);
  updateTargetLine();

  if (currentHeading === null) {
    hint.textContent =
      "Kompass nicht verfügbar. Distanz und Karte helfen weiterhin bei der Orientierung.";
  } else if (distance <= 3) {
    hint.textContent = "Ziel erreicht.";
  } else {
    hint.textContent = "Pfeil zeigt in die Richtung, in die du gehen solltest.";
  }

  handleProximityBeeps(distance);
}

function updateProximityText(distance) {
  if (distance > 20) {
    proximityStatus.textContent = "Noch mehr als 20 m entfernt.";
    proximityStatus.style.color = "#93c5fd";
  } else if (distance > 10) {
    proximityStatus.textContent = "Innerhalb der letzten 20 m.";
    proximityStatus.style.color = "#facc15";
  } else if (distance > 3) {
    proximityStatus.textContent = "Sehr nah am Ziel.";
    proximityStatus.style.color = "#fb923c";
  } else {
    proximityStatus.textContent = "Ziel erreicht.";
    proximityStatus.style.color = "#f87171";
  }
}

function getProximityColor(distance) {
  let red = 59;
  let green = 130;
  let blue = 246;

  if (distance <= 20) {
    const t = Math.max(0, Math.min(1, (20 - distance) / 20));
    red = Math.round(59 + (239 - 59) * t);
    green = Math.round(130 + (68 - 130) * t);
    blue = Math.round(246 + (68 - 246) * t);
  }

  return `rgb(${red}, ${green}, ${blue})`;
}

function applyArrowColor(color) {
  arrow.style.borderBottomColor = color;
  arrow.style.filter = `drop-shadow(0 0 18px ${color})`;
  arrowGlow.style.background = color;
}

function updateTargetLine() {
  if (!map) return;

  if (!targetCoords || !currentCoords) {
    if (lineToTarget) {
      map.removeLayer(lineToTarget);
      lineToTarget = null;
    }
    return;
  }

  const latLngs = [
    [currentCoords.lat, currentCoords.lng],
    [targetCoords.lat, targetCoords.lng],
  ];

  if (!lineToTarget) {
    lineToTarget = L.polyline(latLngs, {
      color: "#38bdf8",
      weight: 3,
      dashArray: "8 8",
      opacity: 0.8,
    }).addTo(map);
  } else {
    lineToTarget.setLatLngs(latLngs);
  }
}

function fitMapToAvailablePoints(forceFit = false) {
  const points = [];

  if (currentCoords) points.push([currentCoords.lat, currentCoords.lng]);
  if (targetCoords) points.push([targetCoords.lat, targetCoords.lng]);

  if (points.length === 0) return;

  if (points.length === 1) {
    if (forceFit) {
      map.setView(points[0], 18);
    }
    return;
  }

  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, { padding: [40, 40] });
}

function handleProximityBeeps(distance) {
  if (distance <= 3 && !targetReachedBeepPlayed) {
    playBeepSequence([
      { frequency: 1200, duration: 140, volume: 0.06 },
      { frequency: 1500, duration: 180, volume: 0.06 },
      { frequency: 1800, duration: 240, volume: 0.06 },
    ]);
    targetReachedBeepPlayed = true;
    nearTargetBeepPlayed = true;
    return;
  }

  if (distance <= 10 && !nearTargetBeepPlayed) {
    playBeepSequence([
      { frequency: 900, duration: 120, volume: 0.05 },
      { frequency: 1100, duration: 120, volume: 0.05 },
    ]);
    nearTargetBeepPlayed = true;
  }

  if (distance > 10) {
    nearTargetBeepPlayed = false;
  }

  if (distance > 3) {
    targetReachedBeepPlayed = false;
  }
}

function playBeepSequence(tones) {
  let delay = 0;
  for (const tone of tones) {
    setTimeout(() => {
      playBeep(tone.frequency, tone.duration, tone.volume);
    }, delay);
    delay += tone.duration + 80;
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

async function playBeep(frequency = 1000, duration = 150, volume = 0.05) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration / 1000);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const lambda1 = toRad(lon1);
  const lambda2 = toRad(lon2);

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

function normalizeDegrees(value) {
  return (value % 360 + 360) % 360;
}

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) {
    return `${distanceMeters.toFixed(1)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function saveTarget(target) {
  localStorage.setItem("rehkitz-target", JSON.stringify(target));
}

function loadSavedTarget() {
  try {
    const raw = localStorage.getItem("rehkitz-target");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      parsed.lat >= -90 &&
      parsed.lat <= 90 &&
      parsed.lng >= -180 &&
      parsed.lng <= 180
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
