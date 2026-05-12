const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
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

initMap();
bindEvents();
registerServiceWorker();
updateStaticUI();
restoreTargetIfAvailable();

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
  startTrackingBtn.addEventListener("click", startLocationTracking);
  requestOrientationBtn.addEventListener("click", requestOrientationPermission);
  testSoundBtn.addEventListener("click", () => playBeep(880, 180, 0.05));
  centerMapBtn.addEventListener("click", fitMapToAvailablePoints);

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
  } else {
    targetText.textContent = "–";
  }
}

function restoreTargetIfAvailable() {
  if (!targetCoords) return;

  updateTargetMarker();
  fitMapToAvailablePoints();
  scanStatus.textContent =
    `Gespeichertes Ziel geladen: ${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
  proximityStatus.textContent = "Gespeichertes Ziel aktiv.";
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
    scanStatus.textContent =
      `QR-Code erkannt, aber ungültiges Format: ${decodedText}`;
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
  fitMapToAvailablePoints();

  await stopScanner();
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
        `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)} ` +
        `(±${Math.round(currentCoords.accuracy)} m)`;

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
    } else {
      hint.textContent = "Ziel ist gesetzt. Bitte jetzt den Standort aktivieren.";
      proximityStatus.textContent = "Ziel vorhanden, Position fehlt noch.";
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

  const rotation = currentHeading === null
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

  if (distance <= 20
