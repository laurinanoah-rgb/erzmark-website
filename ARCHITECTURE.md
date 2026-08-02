# ERZMARK Website – Architektur

Siehe [VISION.md](./VISION.md) für das "Warum" hinter jeder Entscheidung hier.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — `apps/web`
- **React Three Fiber** + **drei** + **postprocessing** für die Echtzeit-3D-Szene
- **zustand** für globalen Client-State (Profile, Weather, Secrets — nicht Redux, kein Prop-Drilling durch drei Ebenen)
- Backend bleibt vorerst MineTrax (Laravel, Hetzner) für Account-Daten/Minecraft-Login; diese App konsumiert dessen API, ersetzt sie nicht in Phase 1.

## Verhältnis zu MineTrax

Diese App ist ein **neues, eigenständiges Frontend** für erzmark.de, nicht Teil des Laravel-Repos. Sie ruft MineTrax-Endpunkte (Account/Skin/Serverstatus) über die API auf, sobald diese existieren. Bis dahin läuft sie mit Mock-Daten für Profile/Serverstatus. Ob MineTrax langfristig nur noch Backend/API wird oder parallel als eigenständige CMS-Seite weiterläuft, ist noch offen — siehe HANDOFF.

## Ordnerstruktur

```
apps/web/src/
  components/
    ui/              wiederverwendbare, dumme UI-Bausteine (Button, Card, ...)
    hero/            Hero-Section-Wrapper um die 3D-Szene, Layout/DOM-Overlay
    navigation/       Header/Nav
    server-status/    Serverstatus-Anzeige (Spieleranzahl, "Willkommen zurück")
    profile/          Profil-Panel, Skin-Anzeige, Login-Status-UI
    auth/             Login/Verknüpfungs-UI (Minecraft-Account-Link)
  three/
    scene/            Scene-Root, Composition der 3D-Welt
    camera/            Kamera-Rig, Kamera-Bewegungen
    lighting/          Lichtquellen (Feuer, Mond, Sterne, Ambient)
    effects/           Postprocessing (Glitch, chromatische Aberration, Bloom)
    particles/         GPU-Partikelsysteme (Funken, Glühwürmchen, Schnee, Regen)
    weather/           Wetter-abhängige 3D-Elemente (Regen-Mesh, Nebel-Volumen, ...)
    audio/             Positional/Ambient-Audio-Nodes innerhalb der Szene
    animation/          Charakter-/Objekt-Animationsclips, Zufalls-Timing-Logik
    physics/            Falls benötigt (Partikelkollision, Wind-Einfluss)
    assets/             GLTF/Textur-Referenzen, keine Logik
  hooks/                React-Hooks als dünne Brücke zu den Systems (useWeather, useSecret, ...)
  systems/              Die eigentlichen Manager — Singletons/Stores, UNABHÄNGIG von React
    animation-manager/  steuert Timing & Auswahl von Idle-Animationen (nie linear/hektisch)
    weather-manager/     holt Wetter-API, mappt auf Szenen-Zustand
    asset-loader/        zentrales Laden/Cachen/Streaming von 3D-Assets
    secret-manager/       generisches Event-System für versteckte Trigger (Rudolf etc.)
    audio-manager/        zentrale Audio-Steuerung, reagiert auf Weather/Secrets
    profile-manager/       Login-Status, Minecraft-Skin-Daten, Personalisierung
    easter-egg-manager/    ambiente Zufalls-Events (rote Augen, Schatten, Rune)
```

## Designprinzip: Systeme, keine Komponenten

Jeder Manager unter `systems/` ist:

- **unabhängig** — funktioniert ohne die anderen Manager, kommuniziert nur über klar definierte Events/Store-Interfaces (kein Manager importiert einen anderen Manager direkt, wo es sich vermeiden lässt).
- **framework-neutral im Kern** — die Logik selbst ist kein React-Hook; React-Komponenten binden sich per dünnem Hook aus `hooks/` an den Manager an. Das erlaubt Tests ohne React und Wiederverwendung z.B. in einem Web Worker.
- **erweiterbar ohne Umbau** — neue Secrets, neue Wetterzustände, neue Idle-Animationen werden als Daten/Config hinzugefügt, nicht als Sonderfall-Code.

## Phase 1 Scope (aktuell)

Nur die Engine-Grundgerüste, jeweils minimal aber funktionsfähig:

1. R3F Canvas + Scene-Root rendert (leere/Platzhalter-Szene)
2. Kamera-Rig vorhanden
3. Basis-Beleuchtung (Ambient + eine Punktlichtquelle als Feuer-Platzhalter)
4. Asset-Loader-Skelett (lädt aktuell nichts Reales, aber Interface steht)
5. Animation-Manager-Skelett (Zufalls-Timing-Grundgerüst, noch ohne echte Clips)
6. Audio-Manager-Skelett (Play/Stop/Volume-Interface, noch ohne echte Sounds)
7. Weather-Manager-Skelett (Mock-Wetterzustand, später echte API)
8. Secret-Manager-Skelett inkl. Rudolf-Listener (Tastatur-Sequenz-Erkennung), Glitch-Effekt kann Platzhalter sein

Assets, echte Animationen, echtes Wetter-API, echter Minecraft-Skin-Import folgen erst danach.
