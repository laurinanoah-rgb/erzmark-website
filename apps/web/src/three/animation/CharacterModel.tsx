"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetLoader } from "@/systems/asset-loader";
import { useAnimationManager } from "@/hooks/useAnimationManager";
import { useProfile } from "@/hooks/useProfile";

const MODEL_URL = "/models/character.glb";
const CROSSFADE_SECONDS = 0.6;

// Die gesamte Szene steht auf Minecraft-Massstab: 1 Einheit = 1 Block. Feuerstelle
// (0.62 breit) und Baeume (6.89 hoch) sind bereits so exportiert -- character.glb nicht.
// Beim Laden wird die Bind-Pose vermessen und auf Spielerhoehe normalisiert; das
// ueberlebt den geplanten Rig-Neuexport (PLAN.md Phase 3) ohne Zahlenpflege.
const PLAYER_HEIGHT = 1.8;

/**
 * Objekte, die das Thomas-Rig aus Blender mitexportiert, die aber nicht zur Figur
 * gehoeren. Alle drei Gruppen wurden zur Laufzeit ueber ihre Weltmasse identifiziert:
 *
 * - `1_Layer_Extrusion` / `2_Layer_Extrusion`: zwei 0.84er Wuerfel bei y=3.80 und y=4.80.
 *   Der Kopf sitzt bei y=2.80 -- sie schweben also frei ueber der Figur. Es sind die
 *   Hilfskoerper des Addons fuer die zweite Skin-Ebene, nicht ans Skelett gebunden.
 *   Sie waren im Bild als graue Kaesten neben dem Kopf sichtbar und haben zusaetzlich
 *   die Bounding-Box auf 4.21 aufgeblaeht, wodurch die Groessennormalisierung die Figur
 *   auf die halbe Hoehe gerechnet hat (echte Figurenhoehe: 2.19).
 * - `0__MATERIALS`: 15x15 cm grosse Platte neben dem Kopf. In Blender haelt sie
 *   Materialreferenzen am Leben, damit sie nicht weggeraeumt werden -- reines Hilfsmittel.
 * - Gesichts-Innenleben (`Top_teeth`, `Bottom_teeth`, `Tongue`, Mund- und Augenweiss-
 *   Teile): Bei einem normalen Minecraft-Skin kommt das Gesicht komplett aus der Textur.
 *   Die Zaehne wurden ausserdem ganz ohne Material exportiert, weshalb three.js sein
 *   weisses Standardmaterial verwendet hat -- sie lagen als weisser Fleck ueber dem
 *   halben Gesicht.
 */
const HIDDEN_RIG_NODES = new Set([
  "1_Layer_Extrusion",
  "2_Layer_Extrusion",
  "0__MATERIALS",
  "Top_teeth",
  "Bottom_teeth",
  "Tongue",
  "Cube021_2", // Augenweiss-Streifen auf der Gesichtsflaeche
  "Cube021_3", // Mundhoehle
]);

// Blender liefert mehrere Skin-Materialien am selben Rig ("Skin_normal", "Skin UV",
// "Skin (DO NoT REMOVE)"). Wird nur eines davon getauscht, bleiben Teile des Koerpers
// auf der eingebackenen Steve-Textur stehen -- deshalb Praefix-Match statt Namensgleichheit.
const SKIN_MATERIAL_PREFIX = "skin";
// Neutraler Erzmark-Abenteurer (VISION.md), gemalt in den echten UV-Regionen des
// Minecraft-Skin-Standardlayouts (siehe blender-source/character.blend) statt des
// im GLB gebackenen Vanilla-Steve-Fallbacks.
const DEFAULT_SKIN_URL = "/textures/erzmark-default-skin.png";
const textureLoader = new THREE.TextureLoader();

// Minecraft-Skins sind Pixel-Art auf 64x64: kein Mipmapping/Filtering, sonst verschwimmt die Textur.
// flipY=false, weil das GLB-UV-Layout der glTF-Konvention folgt (Blender-Export invertiert bereits).
function configureSkinTexture(texture: THREE.Texture) {
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function findSkinMaterials(scene: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const found = new Set<THREE.MeshStandardMaterial>();
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material.name.toLowerCase().startsWith(SKIN_MATERIAL_PREFIX)) {
        found.add(material as THREE.MeshStandardMaterial);
      }
    }
  });
  return [...found];
}

interface Fit {
  scale: number;
  offsetY: number;
}

/**
 * Blendet die Rig-Artefakte aus (siehe HIDDEN_RIG_NODES) sowie jedes Mesh, dessen
 * Material keinen Namen hat -- das sind die Primitiven, die ohne Materialzuweisung
 * exportiert wurden und deshalb im weissen Standardmaterial von three.js landen.
 */
function hideRigArtifacts(scene: THREE.Object3D) {
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const hasUnnamedMaterial = materials.some((material) => !material.name);
    if (HIDDEN_RIG_NODES.has(node.name) || hasUnnamedMaterial) node.visible = false;
  });
}

/**
 * Misst die Bind-Pose und leitet daraus Skalierung und Bodenversatz ab, sodass der
 * NPC exakt PLAYER_HEIGHT hoch ist und mit den Fuessen auf y=0 steht. Wird einmal
 * direkt nach dem Laden aufgerufen -- also bevor der Mixer die erste Animation
 * anwendet -- damit das Ergebnis nicht vom gerade laufenden Clip abhaengt.
 *
 * Rechnet bewusst nur ueber sichtbare Meshes: Box3.setFromObject beruecksichtigt
 * `visible` nicht, und genau die ausgeblendeten Hilfswuerfel haben die Box zuvor
 * fast auf die doppelte Hoehe gezogen.
 */
function measureFit(scene: THREE.Object3D): Fit {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  scene.traverse((node) => {
    if (node instanceof THREE.Mesh && node.visible) box.expandByObject(node);
  });
  const height = box.max.y - box.min.y;
  if (!Number.isFinite(height) || height <= 0) return { scale: 1, offsetY: 0 };
  const scale = PLAYER_HEIGHT / height;
  return { scale, offsetY: -box.min.y * scale };
}

/**
 * Laedt das in Blender gebaute Charakter-Rig (Thomas Rig Legacy, Custom-Export)
 * und bindet die drei Idle-Clips an den bereits existierenden AnimationManager.
 * Der Manager selbst weiss nichts von three.js — er liefert nur die aktuelle Clip-ID,
 * dieser Consumer uebersetzt das in echte THREE.AnimationMixer-Wiedergabe.
 */
export function CharacterModel() {
  const { currentClipId } = useAnimationManager();
  const { profile } = useProfile();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const skinMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [fit, setFit] = useState<Fit>({ scale: 1, offsetY: 0 });

  useEffect(() => {
    let cancelled = false;
    assetLoader.loadGLTF(MODEL_URL).then((loaded) => {
      if (cancelled) return;
      const mixer = new THREE.AnimationMixer(loaded.scene);
      mixerRef.current = mixer;
      const actions: Record<string, THREE.AnimationAction> = {};
      for (const clip of loaded.animations) {
        actions[clip.name] = mixer.clipAction(clip);
      }
      actionsRef.current = actions;

      skinMaterialsRef.current = findSkinMaterials(loaded.scene);
      hideRigArtifacts(loaded.scene);
      loaded.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      setFit(measureFit(loaded.scene));
      setGltf(loaded);
    });
    return () => {
      cancelled = true;
      mixerRef.current?.stopAllAction();
    };
  }, []);

  useEffect(() => {
    const next = actionsRef.current[currentClipId];
    if (!next) return;
    const previous = activeActionRef.current;
    next.reset().play();
    if (previous && previous !== next) {
      previous.crossFadeTo(next, CROSSFADE_SECONDS, false);
    } else {
      next.fadeIn(CROSSFADE_SECONDS);
    }
    activeActionRef.current = next;
    // gltf als Dep: erzwingt einen Re-Run, sobald das Modell (und damit actionsRef) bereit ist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClipId, gltf]);

  // Personalisierung (VISION.md: "Der Skin wird automatisch geladen"): eingeloggt -> echter
  // Minecraft-Skin, ausgeloggt -> der neutrale Erzmark-Abenteurer (eigener Default-Skin).
  useEffect(() => {
    const materials = skinMaterialsRef.current;
    if (materials.length === 0 || !gltf) return;

    let cancelled = false;
    textureLoader.load(profile?.skinUrl ?? DEFAULT_SKIN_URL, (texture) => {
      if (cancelled) return;
      const configured = configureSkinTexture(texture);
      for (const material of materials) {
        material.map = configured;
        material.needsUpdate = true;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.skinUrl, gltf]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  if (!gltf) return null;

  // Rendert bewusst am lokalen Ursprung mit Fuessen auf y=0. Wo der NPC in der Welt
  // steht, entscheidet allein die umgebende <Npc>-Gruppe in SceneRoot -- so bleiben
  // Charakter und Umhang zwangslaeufig deckungsgleich.
  return <primitive object={gltf.scene} position={[0, fit.offsetY, 0]} scale={fit.scale} />;
}
