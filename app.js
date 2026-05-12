const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
const startTrackingBtn = document.getElementById("startTrackingBtn");
const requestOrientationBtn = document.getElementById("requestOrientationBtn");

const scanStatus = document.getElementById("scanStatus");
const permissionStatus = document.getElementById("permissionStatus");
const distanceText = document.getElementById("distanceText");
const headingText = document.getElementById("headingText");
const bearingText = document.getElementById("bearingText");
const targetText = document.getElementById("targetText");
const currentText = document.getElementById("currentText");
const hint = document.getElementById("hint");
const reader = document.getElementById("reader");
const arrow = document.getElementById("arrow");

let map;
let userMarker = null;
let targetMarker = null;
let accuracyCircle = null;

let html5QrCode = null;
let scannerRunning = false;

let watchId = null;
let targetCoords = null;
let currentCoords = null;
let currentHeading = null;

initMap();
bindEvents();
updateUI();

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
  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
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
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
          return { width: size, height: size };
        },
      },
      onScanSuccess,
      () => {}
    );

    scannerRunning = true;
    startScanBtn.disabled = true;
    stopScanBtn.disabled = false;
    scanStatus.textContent = "Scanner aktiv. QR-Code ins Kamerabild halten.";
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
      `QR-Code erkannt, aber keine gültigen Koordinaten gefunden: ${decodedText}`;
    return;
  }

  targetCoords = parsed;
  targetText.textContent = `${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
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

  if (!match && clean.includes("geo:")) {
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
      fitMapToAvailablePoints();
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
          "Kompass freigegeben. Bitte Gerät waagrecht halten und bewegen.";
      } else {
        permissionStatus.textContent = "Kompass-Berechtigung nicht erteilt.";
      }
    } else {
      permissionStatus.textContent =
        "Kompass benötigt keine separate Freigabe oder wird automatisch bereitgestellt.";
    }
  } catch (error) {
    permissionStatus.textContent = `Kompassfreigabe fehlgeschlagen: ${error.message}`;
  }
}

function handleOrientation(event) {
  let heading = null;

  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (event.absolute === true && typeof event.alpha === "number") {
    heading = 360 - event.alpha;
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

  targetMarker.bindPopup("Ziel").openPopup();
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
      fillOpacity: 0.12,
    }).addTo(map);
  } else {
    accuracyCircle.setLatLng([currentCoords.lat, currentCoords.lng]);
    accuracyCircle.setRadius(currentCoords.accuracy);
  }
}

function updateNavigation() {
  if (!targetCoords || !currentCoords) {
    distanceText.textContent = "–";
    bearingText.textContent = "–";
    hint.textContent = "Scanne zuerst ein Ziel und aktiviere den Standort.";
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

  const arrowRotation =
    currentHeading === null
      ? targetBearing
      : normalizeDegrees(targetBearing - currentHeading);

  arrow.style.transform = `rotate(${arrowRotation}deg)`;
  applyArrowColor(distance);

  if (currentHeading === null) {
    hint.textContent =
      "Kompass nicht verfügbar. Karte und Distanz helfen weiterhin bei der Navigation.";
  } else if (distance <= 3) {
    hint.textContent = "Ziel erreicht.";
  } else {
    hint.textContent = "Pfeil zeigt in die Laufrichtung zum Ziel.";
  }
}

function applyArrowColor(distance) {
  let red = 59;
  let green = 130;
  let blue = 246;

  if (distance <= 20) {
    const t = Math.max(0, Math.min(1, (20 - distance) / 20));
    red = Math.round(59 + (239 - 59) * t);
    green = Math.round(130 + (68 - 130) * t);
    blue = Math.round(246 + (68 - 246) * t);
  }

  const color = `rgb(${red}, ${green}, ${blue})`;
  arrow.style.borderBottomColor = color;
  arrow.style.filter = `drop-shadow(0 0 16px ${color})`;
}

function fitMapToAvailablePoints() {
  const points = [];

  if (currentCoords) points.push([currentCoords.lat, currentCoords.lng]);
  if (targetCoords) points.push([targetCoords.lat, targetCoords.lng]);

  if (points.length === 0) return;
  if (points.length === 1) {
    map.setView(points[0], 18);
    return;
  }

  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, { padding: [40, 40] });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

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

function updateUI() {
  targetText.textContent = "–";
  currentText.textContent = "–";
  distanceText.textContent = "–";
  headingText.textContent = "–";
  bearingText.textContent = "–";
}
