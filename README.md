# Rehkitz Finder

Rehkitz Finder ist eine browserbasierte Web-App zur Navigation zu GPS-Zielkoordinaten, die per QR-Code eingelesen werden.

Die App ist für Smartphones gedacht und unterstützt:
- QR-Code-Scan mit Kamera
- Standortbestimmung per GPS
- Zielanzeige auf Karte
- Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- einfache Bedienung über eine reduzierte Oberfläche
- PWA-Grundfunktion mit Service Worker

---

## Funktionen

- QR-Code-Scan mit Smartphone-Kamera
- Einlesen von WGS84-Koordinaten in Dezimalgrad
- Anzeige von Zielpunkt und eigener Position auf einer Karte
- großer Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- Farbübergang des Pfeils je nach Nähe zum Ziel
- Zielradius auf der Karte
- akustisches Signal bei Zielnähe
- Ziel speichern im Browser
- bevorzugte Richtungsbestimmung über GPS-Bewegung
- Kompass als Fallback
- PWA-Unterstützung für Installation auf dem Startbildschirm
- Offline-App-Shell per Service Worker

---

## Bedienung

Die App ist bewusst einfach aufgebaut.

### 1. Suche vorbereiten
Im Bereich **Suche vorbereiten** stehen zwei Buttons zur Verfügung:

- **QR scannen**
- **Suche starten**

### 2. QR scannen
Mit **QR scannen** wird die Kamera geöffnet, um einen QR-Code mit Zielkoordinaten einzulesen.

Unterstützte Formate:

```text
47.3769,8.5417
47.3769;8.5417
geo:47.3769,8.5417
```

### 3. Suche starten
Mit **Suche starten** versucht die App gleichzeitig:

- den **Standort** des Geräts zu starten
- den **Kompass / Richtungssensor** freizugeben

Dadurch wird die Navigation vorbereitet, ohne dass der Nutzer zwei getrennte Schritte ausführen muss.

---

## Navigation

Nach dem Scannen eines Ziels und dem Start der Suche zeigt die App:

- die **Distanz** zum Ziel
- den **Richtungsmodus**
- die **Zielkoordinaten**
- die **aktuelle Position**
- einen **Richtungspfeil**
- die **Karte** mit Ziel und eigener Position

### Richtungslogik
Die App verwendet bevorzugt die **Bewegungsrichtung aus GPS-Positionen**.

Das bedeutet:
- wenn du dich bewegst, wird die Richtung aus den letzten Positionsänderungen berechnet
- wenn noch keine verlässliche Bewegungsrichtung vorliegt, wird der **Kompass** als Fallback verwendet
- wenn weder GPS-Bewegung noch Kompass sinnvoll verfügbar sind, bleiben Karte und Distanzanzeige nutzbar

Das verbessert die Stabilität gegenüber einer rein kompassbasierten Lösung.

---

## Voraussetzungen

Für Kamera, GPS, Kompass und Service Worker sollte die App über einen Webserver laufen.

Empfohlen:
- GitHub Pages
- lokaler Testserver
- HTTPS

Wichtige Hinweise:
- Kamera und Standort funktionieren auf mobilen Browsern meist nur zuverlässig über **HTTPS**
- auf iPhones muss der Orientierungssensor oft zusätzlich freigegeben werden
- auf Android kann der Kompass je nach Browser direkt funktionieren oder vom System abhängen

---

## Lokaler Start

### Mit Python

```bash
python -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

---

## Nutzung auf dem Smartphone

1. App öffnen
2. **QR scannen**
3. Kamerazugriff erlauben
4. **Suche starten**
5. Standortfreigabe erlauben
6. falls nötig Sensorfreigabe bestätigen
7. einige Meter gehen, damit **GPS-Bewegung** erkannt wird
8. dem Pfeil folgen

---

## GitHub Pages

Die App ist als statische Website für GitHub Pages geeignet.

### Aktivierung
1. Repository auf GitHub öffnen
2. **Settings** → **Pages**
3. Source wählen:
   - **Deploy from a branch**
4. Branch wählen:
   - `main`
   - `/ (root)`
5. Speichern

---

## Installation auf dem Smartphone

Die App kann auf dem Startbildschirm installiert werden.

### Android / Chrome
- Seite öffnen
- Browser-Menü öffnen
- **App installieren** oder **Zum Startbildschirm hinzufügen**

### iPhone / Safari
- Seite öffnen
- Teilen-Menü öffnen
- **Zum Home-Bildschirm**

---

## App-Icon / Logo

Damit beim Speichern auf dem Startbildschirm dein Logo angezeigt wird, müssen diese Dateien vorhanden sein:

```text
icons/icon-192.png
icons/icon-512.png
```

Diese Dateien werden über das Web App Manifest eingebunden.

---

## Projektstruktur

```text
Rehkitz-Finder/
├─ index.html
├─ style.css
├─ app.js
├─ manifest.webmanifest
├─ service-worker.js
├─ README.md
└─ icons/
   ├─ icon-192.png
   └─ icon-512.png
```

---

## Offline-Verhalten

Die App nutzt einen Service Worker, um die App-Shell offline verfügbar zu machen.

Wichtig:
- externe Bibliotheken und Kartendaten werden weiterhin über das Netz geladen
- ohne Internet kann die Karte eingeschränkt oder leer sein
- lokale Dateien der App bleiben zwischengespeichert verfügbar

---

## Grenzen der Genauigkeit

- Die Genauigkeit hängt stark vom GPS-Empfang ab
- Im Wald, bei dichter Bewölkung oder nahe an Gebäuden kann die Position ungenauer werden
- Browser-Kompasswerte können je nach Gerät springen oder driften
- Im Stillstand ist die Richtung oft weniger zuverlässig als beim Gehen
- Die App ist als praktische Navigationshilfe gedacht, nicht als vermessungstechnisches Präzisionswerkzeug

---

## Empfohlene Nutzung im Feld

Für die beste Richtungsanzeige:

1. Ziel per QR-Code scannen
2. Suche starten
3. einige Meter in gerader Linie gehen
4. darauf achten, dass der Richtungsmodus möglichst auf **GPS-Bewegung** wechselt
5. dann dem Pfeil folgen

So ist die Richtungsanzeige meist deutlich zuverlässiger als direkt im Stand.
