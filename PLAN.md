# ERZMARK – Umsetzungsplan Hero-Szene (1:1 nach Mockup)

Ergänzt [VISION.md](./VISION.md) (das "Warum") und [ARCHITECTURE.md](./ARCHITECTURE.md)
(das "Wie strukturiert"). Dieses Dokument ist das "Was konkret als Nächstes" — der Weg
vom aktuellen Stand zum Mockup.

---

## 1. Ist-Zustand (gemessen, nicht geschätzt)

Die Szene wurde lokal gebaut, gerendert und Frame für Frame untersucht. Die Engine-
Architektur aus ARCHITECTURE.md steht und ist gut: alle sieben Manager existieren,
sind framework-neutral und sauber über dünne Hooks angebunden. **Das Problem liegt
nicht in der Architektur, sondern in den Assets und im Bildaufbau.**

### 1.1 Blocker: Szene ist offline nicht renderbar

`SceneRoot.tsx` nutzt `<Environment preset="night" />` von drei. Dieses Preset lädt
`dikhololo_night_1k.hdr` zur Laufzeit von einem externen CDN. Schlägt der Download
fehl, wirft der Loader und **die komplette Seite stürzt ab** (weiße Fehlerseite, kein
Canvas). Verifiziert: mit blockiertem CDN rendert die Seite gar nicht, ohne das Preset
sofort wieder.

Das ist nicht nur ein Test-Problem — es ist eine Produktions-Abhängigkeit von fremder
Infrastruktur im kritischen Renderpfad. Muss durch eine lokal ausgelieferte HDR/Env-Map
ersetzt werden.

### 1.2 Blocker: Das Feuer ist kein Feuer

`campfire-flame-atlas.png` (1600×1792, 5×4-Grid) wurde Zelle für Zelle auf Deckung und
Durchschnittsfarbe analysiert:

| Zelle | Deckung | Ø RGB |
|-------|---------|-------|
| 0–3 (Reihe 0) | 34–38 % | 225,170,138 → 185,142,117 |
| **4** | **0 %** | **leer** |
| 5–9 | 28–33 % | ~248,196,166 |
| 10–14 | 21–26 % | ~253,213,187 |
| 15–19 | 16–20 % | ~255,223,202 |

Daraus folgen drei Befunde:

1. **Falsche Farben.** Kein einziger gesättigter Orange-/Rotton im gesamten Atlas. Die
   Werte liegen zwischen Beige und Weiß (hellster Pixel: 255,255,244). Ein Lagerfeuer
   braucht den Verlauf tiefrot → orange → gelb → weißglühend. Deshalb ist die Flamme
   im Render praktisch unsichtbar; sichtbar sind nur die Ember-Partikel.
2. **Frame-Indexierung ist um eins verschoben.** `Campfire.tsx` spielt
   `frameIndex % FRAME_COUNT` mit `FRAME_COUNT = 19`, also Index 0–18. Index 4 ist
   aber leer, Index 19 hat Inhalt. Ergebnis: Das Feuer **blinkt einmal pro Loop
   komplett aus** (bei 14 fps alle ~1,36 s), und ein gültiger Frame wird nie gezeigt.
   Der Codekommentar ("letzte Zelle leer") beschreibt die Datei falsch — leer ist
   Zelle 4, nicht Zelle 19.
3. **Es ist keine Loop-Sequenz.** Die Deckung fällt über den Atlas monoton von 38 % auf
   16 %. Das ist eine sich auflösende Rauchwolke, keine schleifenfähige Flamme. Selbst
   mit korrigiertem Index würde das Feuer schrumpfen und dann hart springen.

**Verwertbar ist der Atlas trotzdem** — als *Rauch*. Genau die aufsteigende, sich
auflösende Rauchsäule, die im Mockup prominent zu sehen ist und aktuell komplett fehlt.

### 1.3 Blocker: Der NPC ist ein Riese und sitzt nicht

`character.glb` Mesh-Bounding-Box: **7,5 Einheiten hoch** (y von −1,5 bis 6,0),
eingesetzt mit `position={[0,0,-1]}` und **ohne `scale`**. Zum Vergleich: die Bäume sind
~4,9 Einheiten hoch. Der NPC überragt also den Wald und wird am oberen Bildrand
abgeschnitten — im Render sieht man nur Kopf und Oberkörper hinter dem Feuer schweben.

Dazu kommt der Rig-Zustand: 268 Nodes, ein vollständiges Blender-Produktions-IK-Rig
(`Arm_IK.L/R`, `FootRollCtrl`, `HeelRoll`, `ik_pole`, `Pupils_controller`), 760 Kanäle
pro Clip, 1,1 MB. Beine hängen als **eigene Root-Nodes** (`L.Leg`, `R.leg`, verschoben
auf y = 1,4) neben dem Armature — das ist der Rest der "Lattice-Punkt-Manipulation" aus
der Commit-Historie. Die Hierarchie ist fragmentiert; deshalb hat die Sitzpose über drei
Anläufe nicht gehalten.

Laufzeit-IK-Controller sind nach dem Backen von Animationen nutzlos. Der Export gehört
auf ein sauberes, gebackenes Rig reduziert.

### 1.4 Alle anderen Assets sind untexturierte Platzhalter

Aus den GLB-Headern:

- `trees.glb` — zwei Meshes namens `Cylinder` und `Cylinder.001`, **keine Texturen**.
  Das sind Low-Poly-Kegel, keine Minecraft-Bäume.
- `campfire-base.glb` — neun Würfel, **keine Texturen**.
- `cape.glb` — ein statisches Mesh, nicht geskinnt.
- `character.glb` — enthält noch die eingebackene `Steve-base`-Textur und **mehrere**
  Skin-Materialien (`Skin_normal`, `Skin (DO NoT REMOVE)`, `Skin UV`). Der Runtime-Swap
  in `CharacterModel.tsx` trifft nur `Skin_normal`.
- Der Boden ist ein `planeGeometry` mit Flat-Color-Material.

**Das ist der Kern der Lücke:** Das Mockup ist eine durchgehend *texturierte*
Minecraft-Szene (Gras, Steinweg, Rinde, Laub, Erde). Die aktuelle Szene ist
untexturierte Flat-Shaded-Geometrie. Kein Postprocessing-Tuning schließt diesen
Abstand — es braucht Assets.

### 1.5 Die gesamte UI-Ebene fehlt

`page.tsx` rendert ausschließlich `<HeroScene />`, und `HeroScene` ist Canvas +
SecretOverlay. Es gibt **kein** DOM-Overlay: keine Navigation, keinen ERZMARK-Titel,
keine Buttons, keine Server-IP. `globals.css` ist unverändertes Next.js-Boilerplate
(weißer Hintergrund, `font-family: Arial`). Vom Mockup ist die komplette
Vordergrund-Ebene noch nicht angefangen.

### 1.6 Sonstiges

- `Erzmark-APP` ist ein **leeres Repo** (nur `.git`, kein einziger Commit).
- Branch `claude/aaa-website-campfire-npc-ln60h6` ist identisch mit `main` und
  `origin/main` (Commit `b194da8`) — die bisherige Arbeit ist vollständig gemergt.
- `next dev` läuft sauber, Build-Toolchain (Next 16.2.12, React 19.2.4, three 0.185)
  ist aktuell und funktioniert.

---

## 2. Was im Mockup tatsächlich zu sehen ist

### 2.1 UI-Ebene (DOM, nicht 3D)

- **Navigation** oben links: `HOME | LORE | CHARAKTERE | SERVER | COMMUNITY | DOWNLOADS`
  — Serifenschrift, weit gesperrt (~0,15 em), cremefarben, dünne vertikale Trenner.
- **Eyebrow**: `RPG · MMO · MINECRAFT-SERVER`, klein, gesperrt.
  *(Im Mockup steht "NNO · NINECRAFT" — Tippfehler des Mockup-Tools, wird korrigiert.)*
- **Titel** `ERZMARK`: sehr große Serifen-Versalien, cremeweiß, dezenter warmer Schein.
- **Fließtext**, zwei Zeilen, gedämpftes Creme, ~60 % Deckkraft.
- **Zwei Buttons** mit verzierter Doppelrahmen-Fassung und Eckbeschlägen:
  `IP kopieren`, `Discord beitreten`.
- **Server-Adresse** `play.erzmark.de`, klein, unter den Buttons.
- **Vignette** ringsum, links deutlich dunkler für Textkontrast.

> **Nicht übernehmen:** Der Text unten links ("Hero-Hintergrund: Minecraft
> Lagerfeuerszene / or browse files") ist ein Upload-Widget des Mockup-Tools, kein
> Bestandteil des Designs.

### 2.2 3D-Ebene, von hinten nach vorne

| Ebene | Inhalt |
|-------|--------|
| Himmel | Nachtblau mit Farbverlauf, blockige Minecraft-Wolkenbänder, Sterne |
| Mond | oben rechts, hell, blockig, mit weichem Halo |
| Fernkulisse | Bergsilhouette mittig hinten, stark im Dunst |
| Mystik | schwach leuchtender Runenkreis hinter der Rauchsäule |
| Wald | dichte, texturierte Blockbäume links und rechts als Rahmen; im linken Wald **zwei rote Augen** |
| Rauch | breite, aufsteigende, sich auflösende Wolkensäule — dominantes Bildelement |
| Feuer | Lagerfeuer mittig links, gekreuzte Holzscheite, kräftige orange-gelbe Flamme |
| NPC | rechts, **sitzend** auf einer Truhe, seitlich zum Feuer gedreht, Kapuze/Umhang, hält einen Stock mit Marshmallow über die Flamme |
| Requisiten | Spitzhacke lehnt links am Feuer, Truhe/Block rechts neben dem NPC |
| Boden | Grasfläche mit Steinweg-Pfad, texturiert, nicht flach |
| Partikel | Funken über dem Feuer, Glühwürmchen, Glitzer-Stern unten rechts |

### 2.3 Licht und Look

- **Zwei Lichtstimmungen**: warmes, flackerndes Feuerlicht von unten-links auf NPC und
  Boden; kühles blaues Mondlicht als Kantenlicht von oben-rechts. Dieser Kontrast trägt
  das ganze Bild.
- Filmischer Look: kräftige Vignette, weiches Bloom auf Feuer und Mond, geringe
  Sättigung außerhalb des Feuerscheins, sichtbarer Dunst/Nebel in der Tiefe.
- **Kamera**: leichte Untersicht, Weitwinkel, Feuer im linken Drittel, NPC im rechten
  Drittel, viel Kopfraum für Rauch und Himmel. Die aktuelle Kamera
  (`[0, 1.6, 5]`, fov 45, Blick auf Bildmitte) trifft diesen Bildaufbau nicht.

---

## 3. Lückenliste

| # | Thema | Ist | Soll |
|---|-------|-----|------|
| 1 | Env-Map | externes CDN, crasht offline | lokal ausgeliefert |
| 2 | Feuer | blasser Rauch-Atlas, blinkt aus | echte Flamme, korrekt geloopt |
| 3 | Rauch | fehlt | dominante Rauchsäule |
| 4 | NPC-Größe | 7,5 Einheiten, abgeschnitten | ~1,8 Einheiten, korrekt eingepasst |
| 5 | NPC-Pose | steht | sitzt auf Truhe, seitlich |
| 6 | NPC-Rig | 268 Nodes, IK, 1,1 MB | gebacken, schlank |
| 7 | Marshmallow-Stock | fehlt | vorhanden, Arm hält ihn |
| 8 | Bäume | untexturierte Kegel | texturierte Blockbäume |
| 9 | Boden | flache Farbfläche | Gras + Steinweg, texturiert |
| 10 | Himmel | schwarz | Verlauf, Blockwolken, Sterne |
| 11 | Berg | fehlt | Silhouette im Dunst |
| 12 | Requisiten | fehlen | Spitzhacke, Truhe |
| 13 | Kamera | mittig, zu eng | Untersicht, Drittel-Aufteilung |
| 14 | UI | komplett fehlend | Nav, Titel, Buttons, IP |
| 15 | Typografie | Arial-Boilerplate | Serifen-Designsystem |
| 16 | Skin-Login | nur Store-Vertrag | echter Minecraft-Skin-Flow |
| 17 | Wetter | Daten da, visuell ungenutzt | Regen/Schnee/Nebel/Sturm sichtbar |
| 18 | Audio | Manager-Skelett | echte Sounds |

---

## 4. Phasenplan

Reihenfolge nach Prinzip: **erst reparieren was kaputt ist, dann das was man sofort
sieht, dann Tiefe.** Nach jeder Phase ist die Seite in einem vorzeigbaren Zustand.

### Phase 0 — Stabilisieren (klein, sofort)

- Lokale Env-Map statt CDN-Preset (Blocker 1.1).
- Frame-Indexierung im Flammen-Atlas korrigieren (Blocker 1.2).
- NPC skalieren und positionieren, damit er im Bild ist (Blocker 1.3, Sofortmaßnahme).
- Screenshot-Skript als feste Referenz ins Repo, damit jede Änderung gegen das Mockup
  geprüft werden kann statt nach Gefühl.

*Ergebnis: Die Szene rendert überall zuverlässig und ist beurteilbar.*

### Phase 1 — Bildaufbau

- Kamera auf die Mockup-Komposition setzen: Untersicht, Feuer links, NPC rechts.
- Zwei-Licht-Setup sauber trennen: warmes Feuerlicht (flackernd, animiert) vs. kühles
  Mondlicht als Kantenlicht.
- Postprocessing nachziehen — die aktuelle Tiefenschärfe ist deutlich zu stark, im
  Mockup ist nur der ferne Hintergrund weich.

*Ergebnis: Die Bildaufteilung stimmt, auch wenn die Assets noch Platzhalter sind.*

### Phase 2 — Assets (der große Block)

Hier steckt der meiste Aufwand. Reihenfolge nach Bildwirkung:

1. **Feuer**: neue Flammen-Sequenz mit korrektem Farbverlauf und sauberem Loop.
   Zusätzlich zwei versetzte Sprite-Ebenen für Tiefe, damit es nicht flach wirkt.
2. **Rauch**: bestehenden Atlas als Rauchsäule wiederverwenden — mehrere Instanzen mit
   versetztem Start, aufsteigend, ausblendend, windabhängig geneigt.
3. **Boden**: Gras + Steinweg als texturierte Blockfläche.
4. **Bäume**: texturierte Blockbäume, per Instancing platziert (Performance-Vorgabe
   aus VISION.md).
5. **Himmel**: Verlauf + Blockwolken + Sterne + Bergsilhouette.
6. **Requisiten**: Truhe, Spitzhacke, Marshmallow-Stock.

### Phase 3 — NPC

- Rig neu exportieren: gebackene Animationen, keine IK-Controller, eine saubere
  Hierarchie, korrekte Maßstäbe.
- Sitzpose als echte gebackene Pose statt Laufzeit-Manipulation.
- Idle-Verhalten aus VISION.md an den bestehenden `animation-manager` binden:
  Atmung als Dauerschleife, darüber gewichtet-zufällig Kopfbewegung, Blick ins Feuer,
  kurzer Blick zum Besucher, Umschauen, Marshmallow drehen.
  Der Manager kann das bereits — es fehlen nur die Clips.
- Blick-Ziel prozedural (Kopf folgt leicht der Maus), damit es nie mechanisch wirkt.

### Phase 4 — Skin-Verknüpfung

- Registrierung + Login.
- Minecraft-Account verknüpfen und **verifizieren** (nicht nur Name eintragen —
  sonst kann jeder jeden Skin beanspruchen). Üblicher Weg: Code im Spiel eingeben
  oder Verifikation über den Server.
- Skin laden, serverseitig cachen, auf den NPC legen.
- Fallback bleibt der Erzmark-Standardreisende.
- Zu klären: Skin-Quelle direkt bei Mojang oder über das bestehende MineTrax-Backend
  (siehe ARCHITECTURE.md).

Technisch ist der Weg schon vorbereitet: `profileManager` und der Textur-Swap in
`CharacterModel.tsx` existieren. Es fehlt der Auth-Flow davor — und die Bereinigung der
mehrfachen Skin-Materialien im GLB.

### Phase 5 — Wetter sichtbar machen

Die Daten kommen bereits live von Open-Meteo. Bisher beeinflussen sie nur Wind und
Sterne. Ergänzen:

- **Regen**: Tropfen, nasser glänzender Boden, mehr Nebel, Zischen und gedämpfte Flamme.
- **Schnee**: Flocken, kalter Bodennebel, sichtbarer Atem des NPC.
- **Nebel**: dichterer Dunst, kürzere Sicht.
- **Sturm**: starker Wind auf Flamme, Rauch und Bäumen, gelegentliche Blitze am Horizont.
- **Klar**: volle Sterne, ruhige Flamme.

Wichtig: Übergänge weich überblenden, nie hart schalten.

### Phase 6 — Audio & Feinschliff

- Knisterndes Feuer als positionaler Sound, Wind, Nachtgeräusche, wetterabhängige Layer.
- Erst nach Nutzerinteraktion starten (Browser-Autoplay-Regeln), mit sichtbarem
  Ton-an-Schalter.
- Ambiente-Zufallsereignisse aus VISION.md: rote Augen, Schatten im Wald, kurz
  aufleuchtende Rune — der `easter-egg-manager` steht bereits.

---

## 5. Betrieb auf dem Hetzner-Server

Damit ohne lokale Arbeitskopie weitergearbeitet werden kann:

- **Git als einziger Übertragungsweg** — kein Kopieren per SCP. Auf dem Server wird das
  Repo geklont und per Pull aktualisiert.
- **Docker + Compose** für einen reproduzierbaren Build; der Node-Build passiert im
  Container, nicht auf dem Host.
- **Caddy oder nginx** als Reverse Proxy davor, TLS automatisch über Let's Encrypt.
- **Deploy-Skript** im Repo (`deploy/`), das Pull, Build und Neustart in einem Befehl
  erledigt.
- Optional später: GitHub Actions, das bei Push auf `main` per SSH deployt.
- **Wichtig zur Erwartung:** Ich habe aus dieser Umgebung **keinen SSH-Zugang** zu
  deinem Server. Ich kann die komplette Deployment-Konfiguration und die Skripte
  schreiben und ins Repo legen — den ersten Verbindungsaufbau musst du selbst ausführen.

---

## 6. Zusätzliche Ideen

Sortiert nach Verhältnis von Wirkung zu Aufwand.

### Stark und günstig

1. **Live-Serverstatus** — echte Spielerzahl im Hero, dazu "Willkommen zurück, ..."
   nach Login (in VISION.md vorgesehen, noch nicht gebaut).
2. **IP-Kopieren mit Rückmeldung** — kurzer Bestätigungs-Toast im Weltstil, nicht als
   Standard-Browser-Element.
3. **Feuer reagiert auf den Besucher** — Mauszeiger nahe der Flamme lässt Funken
   aufstieben. Die Welt reagiert, ohne dass es ein "Feature" wäre.
4. **Echte Tageszeit** — es bleibt immer Nacht, aber Mondphase und Mondstand richten
   sich nach dem echten Datum. Um Mitternacht ist der Mond am höchsten.
5. **Erster Besuch vs. Wiederkehr** — beim ersten Mal blickt der NPC länger zum
   Besucher, danach seltener. Kostet fast nichts, wirkt stark.
6. **Reduzierte Bewegung respektieren** — `prefers-reduced-motion` schaltet auf eine
   ruhige Variante. Barrierefreiheit, und nebenbei ein sicherer Fallback.

### Mittlerer Aufwand

7. **Sitzende Freunde** — sind Freunde online, sitzen weitere Skins am Feuer. Das ist
   der stärkste denkbare Bindungs-Effekt und baut direkt auf dem Skin-System auf.
8. **Saisonale Zustände** — Halloween, Advent, Server-Jubiläum. Der `secret-manager`
   ist bereits generisch genug dafür.
9. **Scroll erweitert die Welt** — beim Scrollen fährt die Kamera weiter in die Szene
   hinein, statt dass die 3D-Szene einfach nach oben wegscrollt.
10. **Lore-Fragmente im Feuer** — sehr selten erscheint kurz ein Schriftzeichen in der
    Glut. Nicht ankündigen (VISION.md, Abschnitt Geheimnisse).
11. **Teilbares Lagerfeuer-Bild** — Screenshot der eigenen Szene mit eigenem Skin als
    Bild zum Teilen. Organische Reichweite.

### Größer

12. **Wetter aus dem Spiel statt aus der Realität** — optional das echte Wetter des
    Minecraft-Servers spiegeln. Verbindet Website und Spiel enger als jede Wetter-API.
13. **Der NPC erinnert sich** — nach Login Anspielungen auf echte Spielereignisse
    ("Du warst lange in den Tiefen"). Braucht Server-Statistiken.

### Pflicht, unabhängig vom Design

14. **Performance-Budget und Abstufung** — die Szene muss auf Mobilgeräten laufen.
    Konkret: reduzierte Partikelzahl, weniger Postprocessing, niedrigere Auflösung auf
    schwachen Geräten. Dazu ein statisches Fallback-Bild, wenn WebGL fehlt.
    Ohne das ist die Seite auf genau dem Gerät unbrauchbar, auf dem dieses Projekt
    gerade besprochen wird.
15. **Ladeerlebnis** — die Assets brauchen Zeit. Ein Ladezustand im Weltstil
    (Rune, die sich schließt) statt eines schwarzen Bildschirms.
16. **Sichtbare Regressionsprüfung** — Screenshot bei jedem Build, damit Render-Fehler
    auffallen. Die Commit-Historie zeigt mehrere solcher Regressionen; der Kommentar in
    `CameraRig.tsx` warnt ausdrücklich davor.

---

## 7. Offene Entscheidungen

1. **Asset-Strategie** — der größte Hebel und die teuerste Entscheidung:
   - *Echte Minecraft-Optik*: Szene als Minecraft-Welt bauen und exportieren. Am
     nächsten am Mockup, aber Texturen von Mojang/Resource-Packs sind lizenzrechtlich
     nicht einfach weiterzuverwenden.
   - *Eigene Blockoptik*: in Blender nachbauen mit eigenen Texturen. Rechtlich sauber,
     unverwechselbar, deutlich mehr Arbeit.
   - *Hybrid*: gerenderter Hintergrund als Bild, nur Feuer, Rauch und NPC live in 3D.
     Am schnellsten sehr nah am Mockup, aber weniger "lebendig" — und widerspricht
     VISION.md ("Keine Videos. Keine GIFs.") im Hintergrund.
2. **Skin-Quelle** — direkt von Mojang oder über MineTrax.
3. **Zweck von `Erzmark-APP`** — das Repo ist leer. Companion-App? Backend? Plugin?
4. **Verifikation der Minecraft-Verknüpfung** — welcher Weg ist für den Server praktikabel.
