# Rehkitz Finder

Browserbasierte Web-App zur Navigation zu GPS-Zielkoordinaten, die per QR-Code eingelesen werden.

## Funktionen

- QR-Code-Scan mit Smartphone-Kamera
- Einlesen von WGS84-Koordinaten in Dezimalgrad
- Anzeige von Zielpunkt und eigener Position auf einer Karte
- großer Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- Farbverlauf des Pfeils:
  - Blau bei mehr als 20 m Entfernung
  - zunehmend roter innerhalb der letzten 20 m
  - Rot am Ziel
- Zielradius auf der Karte
- akustisches Signal bei Zielnähe
- Ziel speichern im Browser
- Ziel löschen und neu scannen
- PWA-Grundunterstützung
- Offline-App-Shell per Service Worker

## Unterstützte QR-Formate

```text
47.3769,8.5417
47.3769;8.5417
geo:47.3769,8.5417
```

## Voraussetzungen

Für Kamera, GPS, Kompass und Service Worker sollte die App über einen Webserver laufen.

Empfohlen:
- GitHub Pages
- lokaler Testserver
- HTTPS

## Lokaler Start

### Mit Python

```bash
python -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

## Nutzung

1. App auf dem Smartphone öffnen
2. **QR scannen**
3. **Standort starten**
4. falls nötig **Kompass freigeben**
5. dem Pfeil folgen
6. bei Bedarf **Ziel löschen** und neu scannen

## GitHub Pages

Die App ist als statische Website für GitHub Pages geeignet.

### Aktivierung
1. Repository auf GitHub öffnen
2. **Settings** → **Pages**

