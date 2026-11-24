import React, {
  Suspense,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Canvas, useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import PageCarousel, { type CarouselPage } from './PageCarousel';

interface SceneProps {
  isDarkMode: boolean;
  showSea: boolean;
  deviceInfo?: any;
  onNavigateToConnect?: () => void;
  onNavigateToPage?: (page: string) => void;
  onPlayClickSound?: () => void;
  isBurgerMenuOpen?: boolean;
  triggerInitialZoom?: boolean;
  showHomeButtons?: boolean;
  homeButtonsIntroDelayMs?: number;
  /** The landmark the camera should zoom to, or null for the island view. */
  focusPage?: string | null;
  /** Jump straight to the new landmark (used under the page-switch fade) */
  snapCamera?: boolean;
}

// ============================================
// Interactive Object Wrapper

interface InteractiveObjectProps {
  children: React.ReactNode;
  onHover: (hovered: boolean) => void;
  onClick?: () => void;
  boundingBox?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  externalHovered?: boolean;
}

// Brightens a landmark when it is hovered or its page is chosen / open, and
// fades the lift in and out (rather than snapping) so stepping between pages
// with the arrows hands the highlight over smoothly.
function ObjectBrightness({
  objectRef,
  isHovered,
  isLit = false,
  isDarkMode,
}: {
  objectRef: React.MutableRefObject<THREE.Object3D | null>;
  isHovered: boolean;
  /** The landmark of the chosen or open page */
  isLit?: boolean;
  isDarkMode?: boolean;
}) {
  const originals = useRef(new Map<any, { color: THREE.Color; emissive: THREE.Color | null; emissiveIntensity: number }>());
  // current lift: colour multiplier, emissive multiplier, emissive boost
  const current = useRef({ color: 1, emissive: 1, boost: 0 });
  const applied = useRef({ color: 1, emissive: 1, boost: 0 });
  const frame = useRef(0);

  useFrame((_, delta) => {
    const object = objectRef.current;
    if (!object) return;
    const on = isHovered || isLit;
    // Night: a strong glow. Day: a clear lift (strong sunlight already
    // falls on the models, so it has to be more than a hint).
    const target = !on
      ? { color: 1, emissive: 1, boost: 0 }
      : isDarkMode
      ? { color: 2.2, emissive: 2.0, boost: 0.5 }
      : { color: isHovered ? 1.45 : 1.42, emissive: 1.2, boost: isHovered ? 0.2 : 0.18 };
    const k = 1 - Math.exp(-delta * 9); // ~0.3 s to settle
    const c = current.current;
    c.color += (target.color - c.color) * k;
    c.emissive += (target.emissive - c.emissive) * k;
    c.boost += (target.boost - c.boost) * k;

    // Only touch the materials while the lift is changing, plus a check
    // now and then for materials that are new (a theme switch rebuilds them)
    const a = applied.current;
    const changing =
      Math.abs(c.color - a.color) > 0.002 ||
      Math.abs(c.emissive - a.emissive) > 0.002 ||
      Math.abs(c.boost - a.boost) > 0.002;
    frame.current = (frame.current + 1) % 30;
    if (!changing && frame.current !== 0) return;

    object.traverse((child: any) => {
      const material = child.isMesh ? child.material : null;
      if (!material?.color) return;
      let original = originals.current.get(material);
      if (!original) {
        original = {
          color: material.color.clone(),
          emissive: material.emissive ? material.emissive.clone() : null,
          emissiveIntensity: material.emissiveIntensity || 0,
        };
        originals.current.set(material, original);
      }
      material.color.copy(original.color).multiplyScalar(c.color);
      if (material.emissive && original.emissive) {
        material.emissive.copy(original.emissive).multiplyScalar(c.emissive);
      }
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = Math.min(
          isDarkMode ? 1.5 : 1.0,
          original.emissiveIntensity + c.boost
        );
      }
    });
    a.color = c.color;
    a.emissive = c.emissive;
    a.boost = c.boost;
  });

  return null;
}

// Light over the chosen landmark at night, faded in and out
function NightSpot({ position, on }: { position: [number, number, number]; on: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame((_, delta) => {
    if (!light.current) return;
    const target = on ? 260 : 0;
    light.current.intensity += (target - light.current.intensity) * (1 - Math.exp(-delta * 9));
  });
  return (
    <pointLight
      ref={light}
      position={[position[0], position[1] + 10, position[2] - 6]}
      color='#ffe2a8'
      intensity={0}
      distance={34}
      decay={1.5}
    />
  );
}

function InteractiveObject({
  children,
  onHover,
  onClick,
  boundingBox = [10, 10, 10],
  position = [0, 0, 0],
  rotation,
  isDarkMode,
  externalHovered = false,
  spotlight = false,
}: InteractiveObjectProps & {
  isDarkMode?: boolean;
  /** This landmark's page is the chosen or open one */
  spotlight?: boolean;
}) {
  const objectRef = useRef<THREE.Group>(null);

  const handlePointerEnter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
      onHover(true);
    },
    [onHover]
  );

  const handlePointerLeave = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = 'default';
      onHover(false);
    },
    [onHover]
  );

  return (
    <group>
      <mesh
        position={position}
        rotation={rotation}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={onClick}
        visible={false}
      >
        <boxGeometry args={boundingBox} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <group ref={objectRef}>{children}</group>
      {/* The chosen / open landmark is lit from above at night (by day it
          only brightens; a clearer daytime marker is still to come) */}
      {isDarkMode && <NightSpot position={position} on={spotlight} />}
      <ObjectBrightness
        objectRef={objectRef}
        // Hover comes from the scene, which clears it whenever a page opens
        // or closes. (A hover kept here got stuck on: once a click opened a
        // page, the pointer never "left" the landmark, so it stayed lit.)
        isHovered={externalHovered}
        isLit={spotlight}
        isDarkMode={isDarkMode}
      />
    </group>
  );
}

// Utility Functions

function safeTraverse(object: any, callback: (node: any) => void) {
  if (!object) return;

  try {
    callback(object);
    if (object.children?.length) {
      object.children.forEach((child: any) => {
        if (child && typeof child === 'object') {
          safeTraverse(child, callback);
        }
      });
    }
  } catch (error) {
    console.warn('Error during scene traversal:', error);
  }
}

function processSceneNode(scene: any, materialProcessor: (material: any) => void) {
  if (!scene?.clone) {
    console.warn('Scene is invalid, skipping processing');
    return null;
  }

  let clonedScene;
  try {
    clonedScene = scene.clone();

    // Deep clone materials to prevent sharing
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material = Array.isArray(child.material)
          ? child.material.map((mat: any) => mat.clone())
          : child.material.clone();
      }
    });
  } catch (error) {
    console.warn('Failed to clone scene:', error);
    return scene;
  }

  if (!clonedScene) return scene;

  safeTraverse(clonedScene, (node: any) => {
    if (!node?.isMesh) return;

    const nodeName = node.name?.toLowerCase() || '';
    const parentName = node.parent?.name?.toLowerCase() || '';

    // Remove spheres but keep fire elements
    const isFireElement = ['fire', 'flame', 'ember'].some(
      (term) => nodeName.includes(term) || parentName.includes(term)
    );

    const isSphere =
      node.geometry &&
      (['SphereGeometry', 'SphereBufferGeometry'].includes(
        node.geometry.type
      ) ||
        nodeName.includes('sphere') ||
        parentName.includes('sphere'));

    if (!isFireElement && isSphere) {
      try {
        node.removeFromParent?.();
      } catch (error) {
        console.warn('Error removing sphere node:', error);
      }
      return;
    }

    // Process materials
    if (node.material) {
      try {
        const materials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        materials.forEach((material: any) => {
          if (material) materialProcessor(material);
        });
      } catch (error) {
        console.warn('Error processing material:', error);
      }
    }
  });

  return clonedScene;
}

// Layout (screen-left is +x from the island view):
//   back row: house — lamp — lighthouse — lamp — beach chairs
//   front: the dog on the dock (between the dock's two lamps), the desk on
//   the right-hand grass
// Everything below (models, lamps, labels, click areas, camera) reads from
// this table.
const LANDMARK = {
  house: { x: 24, z: 10, ground: 0 },
  desk: { x: -12, z: -17, ground: 0.5 }, // up front, on the right-hand grass
  chairs: { x: -28, z: 10, ground: 0.5 },
  dog: { x: -2, z: -39, ground: 1.0 }, // on the dock deck (measured ~0.97)
} as const;

// The lighthouse stands in the middle of the back row, between the house and
// the chairs, larger than the other props as the island's centrepiece
const LIGHTHOUSE = {
  x: (LANDMARK.house.x + LANDMARK.chairs.x) / 2,
  z: LANDMARK.house.z + 4,
  size: 28,
};

// A lamp post on each side of the lighthouse, halfway to the house and to the
// chairs and a little forward so they frame the tower; plus one beside the
// chairs
const LAMPS: { position: [number, number, number]; rotation: number }[] = [
  { position: [(LANDMARK.house.x + LIGHTHOUSE.x) / 2, 0.5, LANDMARK.house.z - 4], rotation: 1 },
  { position: [(LIGHTHOUSE.x + LANDMARK.chairs.x) / 2, 0.5, LANDMARK.chairs.z - 4], rotation: 5.5 },
  { position: [LANDMARK.chairs.x - 9, 0.5, LANDMARK.chairs.z - 2], rotation: 5.5 }, // beside the Connect chairs
];

// Wrap a model so it sits on y=0, is centred on x/z, and its largest side
// is `size` units. Lets models from different sources share one scale.
function fitToSize(object: THREE.Object3D, size: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(object);
  const dims = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  const wrapper = new THREE.Group();
  wrapper.add(object);
  wrapper.scale.setScalar(size / Math.max(dims.x, dims.y, dims.z, 1e-6));
  return wrapper;
}

// Island Terrain Components

// Centres of every lamp bulb (the `Light_Pole_Light` material) in a
// model's own space, so a glow can sit exactly on the bulb
function findBulbCentres(root: THREE.Object3D): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const centres: THREE.Vector3[] = [];
  root.traverse((child: any) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    if (!mats.some((m: any) => m?.name === 'Light_Pole_Light')) return;
    centres.push(new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3()));
  });
  return centres;
}

// Warm light and halo placed on a lit bulb at night
function BulbGlow({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      <pointLight color='#ffc66b' intensity={55} distance={20} decay={1.6} />
      <sprite scale={[5, 5, 1]}>
        <spriteMaterial
          map={getHaloTexture()}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.65}
        />
      </sprite>
    </group>
  );
}

function SimpleIsland({
  isDarkMode,
  deviceInfo,
}: {
  isDarkMode: boolean;
  deviceInfo?: any;
}) {
  const { scene } = useGLTF('/models/object_island.glb');

  // Adjust island scale based on device to maintain proportions with zoomed camera
  const getIslandScale = () => {
    if (deviceInfo?.isLandscapeMobile) {
      return [0.51, 0.51, 0.51] as [number, number, number]; // Between desktop and mobile scaling
    } else if (deviceInfo?.isMobile) {
      return [0.55, 0.55, 0.55] as [number, number, number]; // Slightly larger for mobile
    } else if (deviceInfo?.isTablet) {
      return [0.52, 0.52, 0.52] as [number, number, number]; // Slightly larger for tablet
    } else {
      return [0.5, 0.5, 0.5] as [number, number, number]; // Original desktop scale
    }
  };

  const clonedScene = useMemo(() => processSceneNode(scene, (material) => {
    // The dock's built-in lamp is switched on, like the lamp posts
    if (material.name === 'Light_Pole_Light') {
      material.color.set('#ffe3a3');
      material.emissive?.set?.('#ffcf6e');
      material.emissiveIntensity = isDarkMode ? 2.6 : 0.9;
      material.toneMapped = false;
      material.needsUpdate = true;
      return;
    }
    // Store original color if not already stored
    if (!material.userData) material.userData = {};
    if (!material.userData.originalColor) {
      const brightness = material.color.r + material.color.g + material.color.b;
      const isOverBright =
        brightness > 2.8 ||
        (material.color.r > 0.95 &&
          material.color.g > 0.95 &&
          material.color.b > 0.95);

      material.userData.originalColor = isOverBright
        ? { r: 0.6, g: 0.5, b: 0.4 } // Fallback color for overbright materials
        : {
            r: material.color.r,
            g: material.color.g,
            b: material.color.b,
          };
    }

    const { r, g, b } = material.userData.originalColor;
    material.color.setRGB(r, g, b);

    if (isDarkMode) {
      material.color.multiplyScalar(0.24);
    } else {
      material.color.multiplyScalar(2.4);
    }

    // Set material properties for natural terrain
    if ('roughness' in material) material.roughness = 1.8;
    if ('metalness' in material) material.metalness = 0.1;
    material.needsUpdate = true;
  }), [scene, isDarkMode]);

  // Tag the island so props can find its ground (the lamp model also has a
  // node called object_island)
  if (clonedScene) clonedScene.userData.isIslandGround = true;

  // Where the island's own lamp bulbs are, in world space
  const islandBulbs = useMemo(() => {
    if (!clonedScene) return [];
    const scale = getIslandScale()[0];
    return findBulbCentres(clonedScene).map((c) =>
      c.multiplyScalar(scale).add(new THREE.Vector3(0, -2, 0))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedScene, deviceInfo]);

  // Handle case where scene processing failed
  if (!clonedScene) {
    return null;
  }

  return (
    <group>
      <primitive
        object={clonedScene}
        position={[0, -2, 0]}
        scale={getIslandScale()}
      />
      {/* Night light on the dock's built-in lamp bulb */}
      {isDarkMode &&
        islandBulbs.map((bulb, i) => <BulbGlow key={i} position={bulb} />)}
    </group>
  );
}

// Buildings & Structures

// Each cloud file holds a cluster of clouds; split it into single clouds
// (one per mesh) so they can be scattered around the sky on their own.
function useCloudPieces(modelPath: string, isDarkMode: boolean) {
  const { scene } = useGLTF(modelPath);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const pieces: THREE.Mesh[] = [];
    scene.traverse((child: any) => {
      if (!child.isMesh) return;
      const geometry = child.geometry.clone();
      // Compressed models store positions as packed integers; unpack to
      // floats first so baking in the world transform can't overflow them.
      for (const name of ['position', 'normal']) {
        const attr = geometry.getAttribute(name);
        if (!attr || attr.array instanceof Float32Array) continue;
        const floats = new Float32Array(attr.count * 3);
        for (let i = 0; i < attr.count; i++) {
          floats[i * 3] = attr.getX(i);
          floats[i * 3 + 1] = attr.getY(i);
          floats[i * 3 + 2] = attr.getZ(i);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(floats, 3));
      }
      geometry.applyMatrix4(child.matrixWorld);
      geometry.center();
      // Clouds are flat-ish; turn each so its broad side is its front (+z),
      // which DriftingCloud then points at the island.
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      if (size.x < size.z && size.x < size.y) geometry.rotateY(Math.PI / 2);
      const material = new THREE.MeshStandardMaterial({
        color: isDarkMode ? 0x1a237e : 0xffffff,
        emissive: isDarkMode ? 0x000000 : 0xffffff,
        emissiveIntensity: isDarkMode ? 0 : 0.45,
        roughness: 0.9,
        metalness: 0,
        flatShading: false,
      });
      pieces.push(new THREE.Mesh(geometry, material));
    });
    return pieces;
  }, [scene, isDarkMode]);
}

type CloudSlot = {
  model: 'puffy' | 'stylized';
  piece: number; // which cloud from the file
  position: [number, number, number];
  size: number; // largest side in world units
  rotationY: number;
  drift: number; // how far it wanders left/right
  speed: number;
  phase: number; // start offset so clouds never move in step
};

// Hand-placed so the clouds frame the island without covering the labels:
// heavier on the sides, smaller and higher in the middle, at mixed depths.
const CLOUD_SLOTS: CloudSlot[] = [
  { model: 'puffy', piece: 0, position: [-105, 30, 150], size: 46, rotationY: 0.3, drift: 18, speed: 0.35, phase: 0.0 },
  { model: 'stylized', piece: 0, position: [-70, 44, 95], size: 30, rotationY: 1.1, drift: 14, speed: 0.5, phase: 1.7 },
  { model: 'puffy', piece: 3, position: [-130, 22, 70], size: 28, rotationY: 2.2, drift: 10, speed: 0.6, phase: 3.1 },
  { model: 'stylized', piece: 1, position: [-20, 56, 210], size: 34, rotationY: 0.6, drift: 22, speed: 0.3, phase: 4.4 },
  { model: 'puffy', piece: 6, position: [35, 50, 175], size: 30, rotationY: 1.9, drift: 16, speed: 0.4, phase: 2.3 },
  { model: 'stylized', piece: 2, position: [95, 32, 140], size: 44, rotationY: 2.8, drift: 18, speed: 0.38, phase: 5.2 },
  { model: 'puffy', piece: 9, position: [125, 24, 80], size: 30, rotationY: 0.9, drift: 12, speed: 0.55, phase: 0.9 },
  { model: 'stylized', piece: 0, position: [70, 42, 230], size: 36, rotationY: 3.6, drift: 20, speed: 0.28, phase: 3.8 },
];

function DriftingCloud({
  mesh,
  slot,
  isBurgerMenuOpen,
}: {
  mesh: THREE.Mesh;
  slot: CloudSlot;
  isBurgerMenuOpen?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const frame = useRef(0);
  const object = useMemo(() => fitToSize(mesh.clone(), slot.size), [mesh, slot.size]);
  // Turn the cloud's broad side toward the island, with a slight per-cloud
  // tilt so they don't all look identical
  const faceIsland =
    Math.atan2(-slot.position[0], -slot.position[2]) + (slot.rotationY % 0.5) - 0.25;

  useFrame(({ clock }) => {
    frame.current++;
    if (!ref.current || (isBurgerMenuOpen && frame.current % 3 !== 0)) return;
    const t = clock.getElapsedTime() * slot.speed * 0.1 + slot.phase;
    ref.current.position.x = slot.position[0] + Math.sin(t) * slot.drift;
    ref.current.position.y = slot.position[1] + Math.sin(t * 0.7) * 1.2;
  });

  return (
    <group ref={ref} position={slot.position} rotation={[0, faceIsland, 0]}>
      <primitive object={object} />
    </group>
  );
}

function SimpleClouds({
  isDarkMode,
  deviceInfo,
  isBurgerMenuOpen,
}: {
  isDarkMode: boolean;
  deviceInfo?: any;
  isBurgerMenuOpen?: boolean;
}) {
  const puffy = useCloudPieces('/models/object_cloud_puffy.glb', isDarkMode);
  const stylized = useCloudPieces('/models/object_cloud_stylized.glb', isDarkMode);
  // Phones see a narrower sky, so pull the clouds in a little
  const spread = deviceInfo?.isMobile && !deviceInfo?.isLandscapeMobile ? 0.8 : 1;

  return (
    <group>
      {CLOUD_SLOTS.map((slot, i) => {
        const pieces = slot.model === 'puffy' ? puffy : stylized;
        if (!pieces.length) return null;
        const mesh = pieces[slot.piece % pieces.length];
        const scaled: CloudSlot = {
          ...slot,
          position: [slot.position[0] * spread, slot.position[1], slot.position[2]],
        };
        return (
          <DriftingCloud
            key={`${i}-${isDarkMode}`}
            mesh={mesh}
            slot={scaled}
            isBurgerMenuOpen={isBurgerMenuOpen}
          />
        );
      })}
    </group>
  );
}

// The gentle up-and-down of anything floating: the boat and the swim rings
// share it, so they all ride the same swell
const waterBob = (time: number, phase = 0) => Math.sin(time * 0.8 + phase) * 0.3;

// Which way the boat points (radians around the vertical axis)
const BOAT_HEADING = 1.27; // side-on, hook end pointing at the dock
// Height that keeps the hull sitting on the water rather than in it
const BOAT_WATERLINE = 0.8;
// Moored beside the dock, clear of the shore (~5 m fishing boat)
const BOAT_POSITION: [number, number, number] = [-16, 0.8, -49];
const BOAT_SCALE = 6;

function SimpleBoat({
  isDarkMode,
  isBurgerMenuOpen,
}: {
  isDarkMode: boolean;
  isBurgerMenuOpen?: boolean;
}) {
  const { scene } = useGLTF('/models/object_boat.glb');
  const boatRef = useRef<any>(null);
  const frameCountRef = useRef(0);

  useFrame(({ clock }) => {
    // Throttle animations when burger menu is open for better performance
    frameCountRef.current++;
    const shouldUpdate = isBurgerMenuOpen
      ? frameCountRef.current % 2 === 0
      : true;

    if (boatRef.current && shouldUpdate) {
      const time = clock.getElapsedTime();
      // Bob gently around the waterline instead of dipping under it
      boatRef.current.position.y = BOAT_WATERLINE + waterBob(time);
    }
  });

  const clonedScene = useMemo(() => processSceneNode(scene, (material) => {
    if (!material.userData) material.userData = {};
    if (isDarkMode) {
      material.color.multiplyScalar(0.25);
    } else {
      material.color.multiplyScalar(1.5);
    }
  }), [scene, isDarkMode]);

  // The model's origin is off to one side; centre it so the boat turns in place
  const boatCenter = useMemo(() => {
    if (!clonedScene) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(clonedScene);
    const c = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(-c.x, 0, -c.z);
  }, [clonedScene]);

  // Handle case where scene processing failed
  if (!clonedScene) {
    return (
      <group ref={boatRef} position={[-15, 4, -40]}>
        <mesh>
          <boxGeometry args={[36, 12, 18]} />
          <meshStandardMaterial
            color={isDarkMode ? '#8B4513' : '#D2691E'}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={boatRef}
      position={BOAT_POSITION}
      scale={[BOAT_SCALE, BOAT_SCALE, BOAT_SCALE]}
      rotation={[0, BOAT_HEADING, 0]}
    >
      <group position={boatCenter}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

function SimpleTwoChairs({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_two_chairs.glb');

  const clonedScene = useMemo(
    () =>
      processSceneNode(scene, (material) => {
        // Store original color if not already stored
        if (!material.userData) material.userData = {};
        if (isDarkMode) {
          material.color.multiplyScalar(0.25);
        } else {
          material.color.multiplyScalar(2);
        }
      }),
    [scene, isDarkMode]
  );

  if (!clonedScene) {
    return (
      <group position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[4, 3, 4]} />
          <meshStandardMaterial
            color={isDarkMode ? '#8B4513' : '#D2691E'}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>
    );
  }

  return (
    <primitive
      object={clonedScene}
      position={[LANDMARK.chairs.x, LANDMARK.chairs.ground, LANDMARK.chairs.z]}
      scale={[2, 2, 2]}
      rotation={[0, 2.5, 0]}
    />
  );
}

// Which way the house faces (radians); tuned so its front faces the viewer
const HOUSE_HEADING = 3.14;

function SimpleHouse({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_house.glb');

  const clonedScene = useMemo(
    () =>
      processSceneNode(scene, (material) => {
        // Store original color if not already stored
        if (!material.userData) material.userData = {};
        if (!material.userData.originalColor) {
          const brightness = material.color.r + material.color.g + material.color.b;
          const isOverBright =
            brightness > 2.8 ||
            (material.color.r > 0.95 &&
              material.color.g > 0.95 &&
              material.color.b > 0.95);

          material.userData.originalColor = isOverBright
            ? { r: 0.5, g: 0.3, b: 0.2 } // Fallback color for overbright materials
            : {
                r: material.color.r,
                g: material.color.g,
                b: material.color.b,
              };
        }

        const { r, g, b } = material.userData.originalColor;
        material.color.setRGB(r, g, b);

        if (isDarkMode) {
          material.color.multiplyScalar(0.28);
        } else {
          material.color.multiplyScalar(2.6);
        }

        // Set material properties for house materials
        if ('roughness' in material) material.roughness = 0.7;
        if ('metalness' in material) material.metalness = 0.1;
        material.needsUpdate = true;
      }),
    [scene, isDarkMode]
  );

  if (!clonedScene) {
    return (
      <group position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[6, 8, 6]} />
          <meshStandardMaterial
            color={isDarkMode ? '#654321' : '#8B4513'}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>
    );
  }

  return (
    <primitive
      object={clonedScene}
      position={[LANDMARK.house.x, LANDMARK.house.ground, LANDMARK.house.z]}
      scale={[2.4, 2.4, 2.4]} // beach house on stilts, the island's main building
      rotation={[0, HOUSE_HEADING, 0]}
    />
  );
}

// Soft round glow texture for the dog's lamp halo, made once
let haloTexture: THREE.Texture | null = null;
function getHaloTexture() {
  if (haloTexture) return haloTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 210, 130, 0.9)');
  g.addColorStop(0.35, 'rgba(255, 190, 100, 0.35)');
  g.addColorStop(1, 'rgba(255, 170, 80, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  haloTexture = new THREE.CanvasTexture(canvas);
  return haloTexture;
}

// The dog replaces the stone head (Profile). At night it glows like a lamp.
function SimpleDog({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_dog.glb');

  const object = useMemo(() => {
    // The dog is rigged, so it needs a skeleton-aware clone to render
    const processed = cloneSkinned(scene);
    processed.traverse((child: any) => {
      if (!child.isMesh) return;
      child.frustumCulled = false;
      child.material = child.material.clone();
      // No glow of its own: like the other landmarks it lights up only when
      // hovered, chosen on the island, or while its page (Profile) is open
      const material = child.material;
      material.emissive?.setHex?.(0x000000);
      material.emissiveIntensity = 0;
      material.roughness = 0.8;
      material.needsUpdate = true;
    });
    return fitToSize(processed, 4); // a large dog, slightly over life size
  }, [scene, isDarkMode]);

  if (!object) return null;

  return (
    <group
      position={[LANDMARK.dog.x, LANDMARK.dog.ground, LANDMARK.dog.z]}
      rotation={[0, 2.6, 0]} // facing the viewer, down the dock
    >
      <primitive object={object} />
    </group>
  );
}

// The computer desk replaces the surfboards (Skillset).
function SimpleComputerDesk({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_computer_desk.glb');

  const object = useMemo(() => {
    const processed = processSceneNode(scene, (material) => {
      material.color.multiplyScalar(isDarkMode ? 0.3 : 1.6);
      material.needsUpdate = true;
    });
    return processed ? fitToSize(processed, 8.5) : null; // desk + office chair
  }, [scene, isDarkMode]);

  if (!object) return null;

  return (
    <group
      position={[LANDMARK.desk.x, LANDMARK.desk.ground, LANDMARK.desk.z]}
      rotation={[0, 3.3, 0]}
    >
      <primitive object={object} />
    </group>
  );
}

// How far out the shoreline sits, as a share of the island model's radius
const SHORE_FIT = 0.86;

// Island surfaces a prop can stand on (the ground, rocks, the dock)
const GROUND_MATERIALS = new Set(['Grass_2', 'Island_Rocks', 'Port_Wood']);

// Height of the island's ground at (x, z), or null if there's no island there
function groundHeight(scene: THREE.Object3D, x: number, z: number): number | null {
  let island: THREE.Object3D | null = null;
  scene.traverse((o) => {
    if (!island && o.userData.isIslandGround) island = o;
  });
  if (!island) return null;
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0));
  const hit = ray
    .intersectObject(island, true)
    .find((h: any) => {
      const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
      return GROUND_MATERIALS.has(m?.name);
    });
  return hit ? hit.point.y : null;
}

// Ground heights already found, by position. The island is remounted when
// the theme changes, so without this a prop would drop to y = 0 and pop
// back up a moment later.
const GROUND_CACHE = new Map<string, number>();

// Once the island is in the scene, set each land prop on the ground
function useSnapToGround(
  refs: React.MutableRefObject<(THREE.Object3D | null)[]>,
  spots: { position: [number, number, number] }[]
) {
  const { scene } = useThree();
  React.useLayoutEffect(() => {
    let tries = 0;
    const place = () => {
      scene.updateMatrixWorld(true);
      let placed = 0;
      spots.forEach((spot, i) => {
        const obj = refs.current[i];
        if (!obj) return;
        const key = `${spot.position[0]},${spot.position[2]}`;
        let y = GROUND_CACHE.get(key) ?? null;
        if (y === null) {
          y = groundHeight(scene, spot.position[0], spot.position[2]);
          if (y !== null) GROUND_CACHE.set(key, y);
        }
        if (y !== null) {
          obj.position.y = y;
          placed++;
        }
      });
      return placed === spots.length;
    };
    if (place()) return;
    const timer = window.setInterval(() => {
      if (place() || ++tries > 40) window.clearInterval(timer);
    }, 150);
    return () => window.clearInterval(timer);
  }, [scene, refs, spots]);
}

function shadeForTime(material: any, isDarkMode: boolean) {
  if (!material?.color) return;
  if (!material.userData.baseColor) material.userData.baseColor = material.color.clone();
  material.color.copy(material.userData.baseColor).multiplyScalar(isDarkMode ? 0.28 : 1.25);
  material.needsUpdate = true;
}

// Hammock (Andrey 3D), sized to about 3.5 m long
const HAMMOCK = { position: [-24, 0, -21] as [number, number, number], heading: 0.4, size: 10.5 };
const HAMMOCK_SPOTS = [{ position: HAMMOCK.position }];

function SimpleHammock({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_hammock.glb');
  // Built once; a theme change only recolours it, so it never moves
  const object = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child: any) => {
      if (child.isMesh) child.material = child.material.clone();
    });
    return fitToSize(copy, HAMMOCK.size);
  }, [scene]);
  useEffect(() => {
    object.traverse((child: any) => {
      if (child.isMesh) shadeForTime(child.material, isDarkMode);
    });
  }, [object, isDarkMode]);
  const refs = useRef<(THREE.Object3D | null)[]>([]);
  useSnapToGround(refs, HAMMOCK_SPOTS);
  return (
    <primitive
      ref={(el: THREE.Object3D | null) => {
        refs.current[0] = el; // no return: React 19 would treat it as a cleanup
      }}
      object={object}
      position={HAMMOCK.position}
      rotation={[0, HAMMOCK.heading, 0]}
    />
  );
}

// Set dressing from Poly Pizza (see Credits), each sized on the island's
// ruler (~3 units per metre) and kept inside the fence, off the camera's
// routes to the four landmarks. Land props are set on the ground at
// runtime; floating ones bob on the water like the boat.
type IslandProp = {
  file: string;
  size: number; // largest side, in units
  position: [number, number, number];
  heading?: number;
  float?: boolean;
  fire?: boolean; // glows and lights its surroundings at night
  beacon?: number; // height of a lighthouse lamp above the ground, in units
};

// Height of the lighthouse lamp, scaled with the tower
const BEACON_HEIGHT = 16.2 * (LIGHTHOUSE.size / 20); // 16.2 in the 20-unit model

// Soft round glow (white centre fading to nothing), drawn once and shared
let glowTexture: THREE.CanvasTexture | null = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.18, 'rgba(255, 248, 220, 0.85)');
  g.addColorStop(0.45, 'rgba(255, 236, 170, 0.3)');
  g.addColorStop(1, 'rgba(255, 230, 150, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

// Lighthouse lamp (night only): the lantern glass shines bright and steady,
// with a soft glow around it that breathes slowly, and it lights the island
// around it.
function LighthouseBeacon() {
  const glow = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => getGlowTexture(), []);
  const base = 13;
  useFrame(({ clock }) => {
    if (glow.current) glow.current.scale.setScalar(base * (1 + Math.sin(clock.getElapsedTime() * 1.1) * 0.06));
  });
  return (
    <group>
      {/* the lantern glass: a bright core showing through the windows */}
      <sprite scale={[3.6, 3.6, 1]} renderOrder={10}>
        <spriteMaterial
          map={texture}
          color='#fff4c8'
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {/* the glow around it */}
      <sprite ref={glow} scale={[base, base, 1]} renderOrder={9}>
        <spriteMaterial
          map={texture}
          color='#ffe9a8'
          opacity={0.75}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <pointLight color='#ffe2a0' intensity={160} distance={40} decay={1.4} />
    </group>
  );
}

const ISLAND_PROPS: IslandProp[] = [
  // lighthouse in the middle of the back row (see LIGHTHOUSE)
  { file: 'lighthouse', size: LIGHTHOUSE.size, position: [LIGHTHOUSE.x, 0, LIGHTHOUSE.z], heading: 3.4, beacon: BEACON_HEIGHT },
  // red and white umbrella over the Connect chairs' side
  { file: 'umbrella', size: 7, position: [-19, 0, 2], heading: 0.3 },
  // surfboard and barrel by the house porch
  { file: 'surfboard', size: 6.6, position: [29, 0, -9], heading: 2.6 },
  { file: 'barrel', size: 2.8, position: [33, 0, 4], heading: 0.5 },
  // campfire and tiki head in the front middle
  { file: 'campfire', size: 5, position: [8, 0, -15], fire: true },
  { file: 'tiki', size: 5, position: [14, 0, -10], heading: 3.4 },
  // sand castle on the front left, a gull by the house
  { file: 'sandcastle', size: 5, position: [20, 0, -23], heading: 3.3 },
  { file: 'gull', size: 2.8, position: [24, 0, -15], heading: 2.4 },
  // beach ball on the front right grass, chest by the hammock
  { file: 'beachball', size: 1.4, position: [-3, 0, -6] },
  { file: 'chest', size: 3.2, position: [-31, 0, -13], heading: 3.6 },
  // crab on the front right grass, life ring on the dock deck
  { file: 'crab', size: 2, position: [-22, 0, -26], heading: 3.0 },
  { file: 'lifering', size: 2.4, position: [0.5, 0, -37] },
  // swim tube floating off the front of the island
  { file: 'tube', size: 3.4, position: [14, -1.9, -52], float: true },
];

function IslandPropModel({
  prop,
  index,
  isDarkMode,
}: {
  prop: IslandProp;
  index: number;
  isDarkMode: boolean;
}) {
  const { scene } = useGLTF(`/models/props/${prop.file}.glb`);
  // Built once; a theme change only recolours it, so it never moves
  const object = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child: any) => {
      if (!child.isMesh) return;
      child.material = child.material.clone();
      child.castShadow = false;
    });
    return fitToSize(copy, prop.size);
  }, [scene, prop.size]);
  useEffect(() => {
    object.traverse((child: any) => {
      if (!child.isMesh) return;
      shadeForTime(child.material, isDarkMode);
      if (prop.fire && child.material.emissive) {
        child.material.emissive.set(isDarkMode ? '#ff9a3c' : '#000000');
        child.material.emissiveIntensity = isDarkMode ? 0.9 : 0;
      }
    });
  }, [object, isDarkMode, prop.fire]);

  const refs = useRef<(THREE.Object3D | null)[]>([]);
  const beaconRef = useRef<THREE.Group>(null);
  const spots = useMemo(() => (prop.float ? [] : [{ position: prop.position }]), [prop]);
  useSnapToGround(refs, spots);
  useFrame(({ clock }) => {
    const obj = refs.current[0];
    if (prop.float && obj) obj.position.y = prop.position[1] + waterBob(clock.getElapsedTime(), 0.9 + index * 0.7);
    // the lamp rides with the lighthouse once it is set on the ground
    if (beaconRef.current && obj) beaconRef.current.position.y = obj.position.y + (prop.beacon ?? 0);
  });

  return (
    <group>
      <primitive
        ref={(el: THREE.Object3D | null) => {
          refs.current[0] = el; // no return: React 19 would treat it as a cleanup
        }}
        object={object}
        position={prop.position}
        rotation={[0, prop.heading ?? 0, 0]}
      />
      {/* the lighthouse lamp is only lit at night */}
      {prop.beacon !== undefined && isDarkMode && (
        <group ref={beaconRef} position={[prop.position[0], prop.beacon, prop.position[2]]}>
          <LighthouseBeacon />
        </group>
      )}
      {/* firelight at night */}
      {prop.fire && isDarkMode && (
        <pointLight
          position={[prop.position[0], 3, prop.position[2]]}
          color='#ff9a3c'
          intensity={90}
          distance={22}
          decay={1.5}
        />
      )}
    </group>
  );
}

function IslandProps({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <>
      {ISLAND_PROPS.map((prop, i) => (
        <IslandPropModel key={prop.file} prop={prop} index={i} isDarkMode={isDarkMode} />
      ))}
    </>
  );
}

function SimpleIslandLamp({
  isDarkMode,
  position = [0, 0, 0],
  rotation,
  deviceInfo,
}: {
  isDarkMode: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  deviceInfo?: any;
}) {
  const { scene } = useGLTF('/models/object_island_lamp.glb');

  // Use the same scale calculation as the island for consistency
  const getLampScale = () => {
    if (deviceInfo?.isLandscapeMobile) {
      return [0.51, 0.51, 0.51] as [number, number, number];
    } else if (deviceInfo?.isMobile) {
      return [0.55, 0.55, 0.55] as [number, number, number];
    } else if (deviceInfo?.isTablet) {
      return [0.52, 0.52, 0.52] as [number, number, number];
    } else {
      return [0.5, 0.5, 0.5] as [number, number, number];
    }
  };

  const clonedScene = useMemo(() => processSceneNode(scene, (material) => {
    // The bulb is switched on: lit softly by day, brightly at night
    if (material.name === 'Light_Pole_Light') {
      material.color.set('#ffe3a3');
      material.emissive?.set?.('#ffcf6e');
      material.emissiveIntensity = isDarkMode ? 2.6 : 0.9;
      material.toneMapped = false;
      material.needsUpdate = true;
      return;
    }
    // Store original color if not already stored - same as island processing
    if (!material.userData) material.userData = {};
    if (!material.userData.originalColor) {
      const brightness = material.color.r + material.color.g + material.color.b;
      const isOverBright =
        brightness > 2.8 ||
        (material.color.r > 0.95 &&
          material.color.g > 0.95 &&
          material.color.b > 0.95);

      material.userData.originalColor = isOverBright
        ? { r: 0.6, g: 0.5, b: 0.4 } // Fallback color for overbright materials
        : {
            r: material.color.r,
            g: material.color.g,
            b: material.color.b,
          };
    }

    const { r, g, b } = material.userData.originalColor;
    material.color.setRGB(r, g, b);

    if (isDarkMode) {
      material.color.multiplyScalar(0.15);
    } else {
      material.color.multiplyScalar(1.4);
    }

    // Set material properties for natural terrain - same as island
    if ('roughness' in material) material.roughness = 0.8;
    if ('metalness' in material) material.metalness = 0.0;
    material.needsUpdate = true;
  }), [scene, isDarkMode]);

  // The bulb hangs off the lamp's arm; find it so the glow sits on it
  const lampBulbs = useMemo(() => {
    if (!clonedScene) return [];
    const scale = getLampScale()[0];
    return findBulbCentres(clonedScene).map((c) => c.multiplyScalar(scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedScene, deviceInfo]);

  // Handle case where scene processing failed
  if (!clonedScene) {
    return (
      <group position={position}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 4]} />
          <meshStandardMaterial
            color={isDarkMode ? '#444444' : '#888888'}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation}>
      <primitive object={clonedScene} scale={getLampScale()} />
      {/* At night the bulb lights the ground around it */}
      {isDarkMode &&
        lampBulbs.map((bulb, i) => <BulbGlow key={i} position={bulb} />)}
    </group>
  );
}

// Environment (Sky, Sea, Camera)

// Port Jeffrey's own palette. Day: an airy sky warming to a cream horizon
// over an azure-to-cobalt sea, the same blue family as the UI (#12508f,
// #0b3a73). Night: deep navy sky and sea, matching the night UI.
const PALETTE = {
  light: {
    skyTop: '#9fcbf2',
    horizon: '#fdf2e2',
    sea: '#0f4f96', // deep cobalt toward the horizon
    shallow: '#3b9be0', // bright azure close to the viewer
    foam: '#f2fdff',
    sunDir: [-0.75, 0.13, 1] as [number, number, number],
    sunColor: '#fff1d6',
  },
  dark: {
    skyTop: '#070d24',
    horizon: '#2b2d5c',
    sea: '#101d38', // night navy far away
    shallow: '#1d3358', // a touch lighter close by
    foam: '#6c8bb5',
    sunDir: [0.75, 0.15, 1] as [number, number, number], // moon
    sunColor: '#9fb6ff',
  },
};

function SimpleSky({ isDarkMode }: { isDarkMode: boolean }) {
  const colors = isDarkMode ? PALETTE.dark : PALETTE.light;
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(colors.skyTop) },
      horizon: { value: new THREE.Color(colors.horizon) },
    }),
    [colors.skyTop, colors.horizon]
  );

  return (
    <mesh scale={[1000, 1000, 1000]}>
      <sphereGeometry args={[1, 48, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 top;
          uniform vec3 horizon;
          varying vec3 vDir;
          void main() {
            float h = smoothstep(-0.02, 0.38, vDir.y);
            gl_FragColor = vec4(mix(horizon, top, h), 1.0);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}

// Ocean: a gentle swell moves the surface (calm at the beach so water never
// covers the sand), smooth waves and ripples shade it, and small glints
// show where it mirrors the sun or moon. No sky reflection, so the far
// water never smears.
const OCEAN_SWELLS = `
  // direction.xy, frequency, speed ; amplitude in SWELL_AMP
  const int SWELLS = 3;
  const vec4 SWELL[3] = vec4[3](
    vec4(1.0, 0.35, 0.045, 0.9),
    vec4(-0.45, 1.0, 0.07, 1.2),
    vec4(0.8, -0.7, 0.12, 1.7)
  );
  const float SWELL_AMP[3] = float[3](0.85, 0.48, 0.24);
`;

const OCEAN_VERTEX = `
  uniform float uTime;
  uniform vec4 uShore; // centre x, centre z, radius x, radius z
  varying vec3 vWorld;
  ${OCEAN_SWELLS}
  #include <fog_pars_vertex>

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    float d = length((p - uShore.xy) / uShore.zw);
    // calm at the beach so water never covers the sand, flat far away
    float calm = smoothstep(0.95, 1.45, d) * (1.0 - smoothstep(220.0, 290.0, length(p)));
    float h = 0.0;
    for (int i = 0; i < SWELLS; i++) {
      vec2 dir = normalize(SWELL[i].xy);
      h += sin(dot(p, dir) * SWELL[i].z + uTime * SWELL[i].w) * SWELL_AMP[i];
    }
    world.y += h * calm;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const OCEAN_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uSkyTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uNight;
  varying vec3 vWorld;
  // waves that shade the surface: direction.xy, frequency, speed ;
  // slope in WAVE_SLOPE
  const vec4 WAVE[4] = vec4[4](
    vec4(1.0, 0.35, 0.09, 0.9),
    vec4(-0.45, 1.0, 0.13, 1.2),
    vec4(0.8, -0.7, 0.21, 1.5),
    vec4(-0.9, -0.3, 0.17, -1.3)
  );
  const float WAVE_SLOPE[4] = float[4](0.16, 0.13, 0.1, 0.08);
  #include <fog_pars_fragment>

  void main() {
    vec2 p = vWorld.xz;
    float dist = distance(cameraPosition.xz, p);

    // Smooth waves: gentle swells plus two small ripple sets, used for
    // shading only (the surface itself stays calm by the beach). Ripples
    // fade with distance so far water doesn't turn into fine stripes.
    vec2 slope = vec2(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 dir = normalize(WAVE[i].xy);
      slope += dir * cos(dot(p, dir) * WAVE[i].z + uTime * WAVE[i].w) * WAVE_SLOPE[i];
    }
    float near = 1.0 - smoothstep(50.0, 180.0, dist);
    vec2 d1 = normalize(vec2(0.9, 0.4));
    vec2 d2 = normalize(vec2(-0.6, 0.8));
    slope += d1 * cos(dot(p, d1) * 0.55 + uTime * 1.6) * 0.05 * near;
    slope += d2 * cos(dot(p, d2) * 0.8 - uTime * 2.0) * 0.035 * near;
    slope *= 1.0 - 0.7 * smoothstep(80.0, 260.0, dist);
    vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

    // lighter blue close to the viewer, deepening toward the horizon;
    // based on distance from the camera, so it never forms a ring
    float far = smoothstep(25.0, 230.0, dist);
    vec3 water = mix(uShallow, uDeep, far);

    // wave faces turned toward the light are a touch lighter, the others a
    // touch deeper (relative to flat water, so only the waves show)
    vec3 sun = normalize(uSunDir);
    vec3 key = normalize(vec3(sun.x, 1.2, sun.z));
    water *= 1.0 + 1.4 * (dot(n, key) - key.y);

    // a hint of sky on the far water only
    water = mix(water, uHorizon, 0.18 * far);

    // small glints where the waves mirror the sun or moon (the moon's are
    // tighter and dimmer), fading out so far water stays calm
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 r = reflect(-v, n);
    float hit = pow(max(dot(r, sun), 0.0), mix(250.0, 600.0, uNight));
    float glint = hit * (1.0 - smoothstep(60.0, 200.0, dist));
    water = mix(water, mix(uFoam, uSunColor, 0.5), min(glint * mix(0.6, 0.25, uNight), 0.6));

    gl_FragColor = vec4(water, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function LowPolyOcean({
  isDarkMode,
  deviceInfo,
}: {
  isDarkMode: boolean;
  deviceInfo?: any;
}) {
  const { scene } = useGLTF('/models/object_island.glb');
  const colors = isDarkMode ? PALETTE.dark : PALETTE.light;
  const islandScale = deviceInfo?.isLandscapeMobile
    ? 0.51
    : deviceInfo?.isMobile
    ? 0.55
    : deviceInfo?.isTablet
    ? 0.52
    : 0.5;

  // Shoreline ellipse from the island model's footprint
  const shore = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return new THREE.Vector4(
      center.x * islandScale,
      center.z * islandScale,
      (size.x / 2) * islandScale * SHORE_FIT,
      (size.z / 2) * islandScale * SHORE_FIT
    );
  }, [scene, islandScale]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: OCEAN_VERTEX,
        fragmentShader: OCEAN_FRAGMENT,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uShore: { value: new THREE.Vector4() },
            uDeep: { value: new THREE.Color() },
            uShallow: { value: new THREE.Color() },
            uFoam: { value: new THREE.Color() },
            uSkyTop: { value: new THREE.Color() },
            uHorizon: { value: new THREE.Color() },
            uSunDir: { value: new THREE.Vector3() },
            uSunColor: { value: new THREE.Color() },
            uNight: { value: 0 },
          },
        ]),
      }),
    []
  );

  useEffect(() => {
    material.uniforms.uShore.value.copy(shore);
    material.uniforms.uDeep.value.set(colors.sea);
    material.uniforms.uShallow.value.set(colors.shallow);
    material.uniforms.uFoam.value.set(colors.foam);
    material.uniforms.uSkyTop.value.set(colors.skyTop);
    material.uniforms.uHorizon.value.set(colors.horizon);
    // Low sun (or moon) ahead of the viewer, so its glitter path is in view
    material.uniforms.uSunDir.value.set(...colors.sunDir);
    material.uniforms.uSunColor.value.set(colors.sunColor);
    material.uniforms.uNight.value = isDarkMode ? 1 : 0;
  }, [material, shore, colors, isDarkMode]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group>
      {/* Detailed water where the camera looks */}
      <mesh position={[0, -2, 70]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[620, 620, 155, 155]} />
      </mesh>
      {/* Flat water beyond it, out to the horizon */}
      <mesh position={[0, -2.6, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[4000, 4000, 1, 1]} />
      </mesh>
    </group>
  );
}

// Haze that blends the far sea into the horizon colour
function SceneHaze({ isDarkMode }: { isDarkMode: boolean }) {
  const color = isDarkMode ? PALETTE.dark.horizon : PALETTE.light.horizon;
  return <fog attach='fog' args={[color, 220, 700]} />;
}

function SimpleOceanWaves({
  isDarkMode,
  isBurgerMenuOpen,
}: {
  isDarkMode: boolean;
  isBurgerMenuOpen?: boolean;
}) {
  const { scene } = useGLTF('/models/object_ocean_waves.glb');
  const wavesRef = useRef<any>(null);
  const frameCountRef = useRef(0);

  useFrame(({ clock }) => {
    // Throttle animations when burger menu is open for better performance
    frameCountRef.current++;
    const shouldUpdate = isBurgerMenuOpen
      ? frameCountRef.current % 2 === 0
      : true;

    if (wavesRef.current) {
      wavesRef.current.position.y = -1.5;
      wavesRef.current.position.x = -3;

      if (shouldUpdate) {
        const time = clock.getElapsedTime();
        wavesRef.current.rotation.y = Math.sin(time * 0.3) * 0.5;
      }
    }
  });

  const clonedScene = processSceneNode(scene, (material) => {
    // Simplified water material processing
    if (isDarkMode) {
      material.color.setHex(0x000a0f);
    } else {
      material.color.setHex(0x1a4d66);
    }

    // Water-specific properties
    if ('roughness' in material) material.roughness = 0.2;
    if ('metalness' in material) material.metalness = 0.0;
    if ('transparent' in material) material.transparent = true;
    if ('opacity' in material) material.opacity = isDarkMode ? 0.4 : 0.7;
    material.needsUpdate = true;
  });

  // Handle case where scene processing failed
  if (!clonedScene) {
    return (
      <group ref={wavesRef} position={[0, -2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2000, 1000, 1]}>
          <planeGeometry args={[1, 1, 32, 32]} />
          <meshStandardMaterial
            color={isDarkMode ? '#000a0f' : '#1a4d66'}
            transparent
            opacity={0.6}
            side={2}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={wavesRef}
      position={[0, -2, 0]} // Match original SimpleSea position
      scale={[80, 0.8, 40]} // Significantly increased scale to match original sea coverage (2000x1000 area)
      rotation={[0, 0, 0]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// Where the camera looks when a landmark is opened, slightly above each
// model's base so the whole object sits in frame.
const FOCUS_TARGETS: Record<string, THREE.Vector3> = {
  connect: new THREE.Vector3(LANDMARK.chairs.x, 3, LANDMARK.chairs.z),
  portfolio: new THREE.Vector3(LANDMARK.house.x, 7.5, LANDMARK.house.z),
  profile: new THREE.Vector3(LANDMARK.dog.x, LANDMARK.dog.ground + 1.5, LANDMARK.dog.z),
  skillset: new THREE.Vector3(LANDMARK.desk.x, 2.8, LANDMARK.desk.z),
};

// Wide landmarks (the row of surfboards) need the camera a little further back
// Scaled to each landmark's real size, so each fills a similar share of the view
const FOCUS_DISTANCE_SCALE: Record<string, number> = { skillset: 0.8, profile: 0.55, portfolio: 1.6 };

// Which landmark belongs to which page
const PAGE_OBJECT: Record<string, string> = {
  connect: 'twochairs',
  portfolio: 'house',
  profile: 'stonehead',
  skillset: 'surfboard',
};

// Pages whose panel is a drawer on the left: the camera frames the model in
// the space the drawer leaves free on the right.
// Drawer side per page; the camera frames the landmark on the other side
const LEFT_DRAWER_PAGES = new Set(['skillset', 'connect']);
const RIGHT_DRAWER_PAGES = new Set(['portfolio', 'profile']);

const ORIGIN = new THREE.Vector3(0, 0, 0);

// Camera that eases in on load, flies to a landmark when its page opens,
// and flies back to the island view when the page closes.
function AnimatedCamera({
  deviceInfo,
  triggerInitialZoom = false,
  focusPage = null,
  snap = false,
  onHomeChange,
}: {
  deviceInfo?: any;
  triggerInitialZoom?: boolean;
  focusPage?: string | null;
  snap?: boolean;
  /** Called with true once the camera has settled on the island view, and
   * false as soon as it starts moving away (or toward it) */
  onHomeChange?: (atHome: boolean) => void;
}) {
  const atHomeRef = useRef<boolean | null>(null);
  const cameraRef = useRef<any>(null);
  // Share of the screen the open drawer really covers, measured from the
  // page (so the framing stays right at every window size)
  const measuredShare = useRef<number | null>(null);
  const measureFrame = useRef(0);
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const introStarted = useRef(false);
  const introDone = useRef(!triggerInitialZoom);
  const tween = useRef({
    key: 'home' as string,
    elapsed: Infinity, // already at rest on the island view
    duration: 1.4,
    fromPos: new THREE.Vector3(),
    fromLook: new THREE.Vector3(),
    fromFilm: 0,
  });
  const scratch = useRef({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    right: new THREE.Vector3(),
  });

  const getCameraSettings = () => {
    if (deviceInfo?.isLandscapeMobile) {
      return { position: [-2.5, 15, -80] as [number, number, number], fov: 50 };
    } else if (deviceInfo?.isMobile) {
      return deviceInfo.orientation === 'portrait'
        ? { position: [-10, 35, -100] as [number, number, number], fov: 70 }
        : { position: [-2.5, 15, -80] as [number, number, number], fov: 50 };
    } else if (deviceInfo?.isTablet) {
      return deviceInfo.orientation === 'portrait'
        ? { position: [-10, 35, -95] as [number, number, number], fov: 60 }
        : { position: [-2.5, 15, -80] as [number, number, number], fov: 50 };
    }
    return { position: [-2.5, 15, -80] as [number, number, number], fov: 50 };
  };

  const cameraSettings = getCameraSettings();
  const home = new THREE.Vector3(...cameraSettings.position);
  const isPortraitPhone =
    !!deviceInfo?.isMobile && deviceInfo?.orientation === 'portrait';
  // How far the camera sits from a landmark when zoomed in
  const focusDistance = isPortraitPhone ? 42 : deviceInfo?.isMobile ? 30 : 34;

  // Start a little further back, then ease in once the island is revealed
  const startingPosition: [number, number, number] = [
    cameraSettings.position[0],
    cameraSettings.position[1],
    cameraSettings.position[2] - 10,
  ];

  useEffect(() => {
    if (triggerInitialZoom && !introStarted.current && cameraRef.current) {
      introStarted.current = true;
      introDone.current = false;
      cameraRef.current.position.set(...startingPosition);
      tween.current.key = 'intro'; // restart the tween from the start position
    }
  });

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (camera.fov !== cameraSettings.fov) {
      camera.fov = cameraSettings.fov;
      camera.updateProjectionMatrix();
    }

    const { pos, look, dir } = scratch.current;
    const target = focusPage ? FOCUS_TARGETS[focusPage] : undefined;

    if (target) {
      // Approach the landmark along the line from the island view
      dir.copy(home).sub(target).normalize();
      const distance = focusDistance * (FOCUS_DISTANCE_SCALE[focusPage!] ?? 1);
      pos.copy(target).addScaledVector(dir, distance);
      pos.y = Math.max(pos.y, target.y + 4);
      look.copy(target);
    } else {
      pos.copy(home);
      look.copy(ORIGIN);
    }

    // Shift the lens (not the aim) by half the drawer's width, so the
    // landmark sits exactly in the centre of the part of the screen the
    // drawer leaves free. Same share of the screen as SideDrawer's width.
    const drawerSide = !target
      ? 0
      : LEFT_DRAWER_PAGES.has(focusPage!)
      ? -1
      : RIGHT_DRAWER_PAGES.has(focusPage!)
      ? 1
      : 0;
    // Measure the drawer that is on screen every few frames; until one is
    // there, fall back to the widths SideDrawer uses
    measureFrame.current = (measureFrame.current + 1) % 10;
    if (measureFrame.current === 0 && typeof document !== 'undefined') {
      const aside = document.querySelector('aside[aria-label]');
      measuredShare.current = aside
        ? Math.min(1, aside.getBoundingClientRect().width / window.innerWidth)
        : null;
    }
    const guessedShare = isPortraitPhone
      ? 1
      : deviceInfo?.isLandscapeMobile ||
        (deviceInfo?.isMobile && deviceInfo?.orientation === 'landscape')
      ? 0.58
      : deviceInfo?.isTablet && deviceInfo?.orientation === 'portrait'
      ? 0.62
      : 0.5;
    const coverShare = target ? measuredShare.current ?? guessedShare : 0;
    // A drawer that (nearly) fills the screen leaves nowhere to frame the
    // landmark, so the lens stays centred
    const drawerShare = coverShare > 0.9 ? 0 : coverShare;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cameraSettings.fov / 2));
    const filmTarget =
      drawerSide * (drawerShare / 2) * 2 * tanHalf * camera.aspect * camera.getFilmWidth();

    // Each new destination starts a fresh tween from wherever the camera is,
    // eased in and out so it never jumps or snaps to a stop.
    const key = focusPage ?? 'home';
    const tw = tween.current;
    if (tw.key !== key) {
      tw.key = key;
      tw.duration = introDone.current ? 1.4 : 3;
      // Under the page-switch fade the camera jumps straight there
      tw.elapsed = snap ? tw.duration : 0;
      tw.fromPos.copy(camera.position);
      tw.fromLook.copy(lookAt.current);
      tw.fromFilm = camera.filmOffset;
    }
    tw.elapsed += Math.min(delta, 1 / 20);
    const p = Math.min(tw.elapsed / tw.duration, 1);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    camera.position.lerpVectors(tw.fromPos, pos, e);
    lookAt.current.lerpVectors(tw.fromLook, look, e);
    camera.lookAt(lookAt.current);
    const film = tw.fromFilm + (filmTarget - tw.fromFilm) * e;
    if (Math.abs(camera.filmOffset - film) > 1e-4) {
      camera.filmOffset = film;
      camera.updateProjectionMatrix();
    }

    if (p >= 1) introDone.current = true;

    // Tell the scene whether the camera is resting on the island view, so
    // the island labels only show once a zoom in or out has finished
    // (not before the opening zoom has run, so labels don't flash at load)
    const atHome = tw.key === 'home' && p >= 1 && introDone.current;
    if (atHomeRef.current !== atHome) {
      atHomeRef.current = atHome;
      onHomeChange?.(atHome);
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={triggerInitialZoom ? startingPosition : cameraSettings.position}
      fov={cameraSettings.fov}
    />
  );
}

// Tracks where the dock is on screen, for the page picker that sits below it.
// Only reports when it actually moves (or the scene would re-render every
// frame), and rests while a page is open.
const DOCK_ANCHOR = new THREE.Vector3(LANDMARK.dog.x, 0, LANDMARK.dog.z - 3);

function DockTracker({
  onMove,
  paused = false,
}: {
  onMove: (screen: [number, number]) => void;
  paused?: boolean;
}) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  const last = useRef<[number, number] | null>(null);

  useFrame(() => {
    if (paused) return;
    point.copy(DOCK_ANCHOR).project(camera);
    const x = (point.x * 0.5 + 0.5) * size.width;
    const y = (point.y * -0.5 + 0.5) * size.height;
    const prev = last.current;
    if (prev && Math.abs(prev[0] - x) <= 0.5 && Math.abs(prev[1] - y) <= 0.5) return;
    last.current = [x, y];
    onMove([x, y]);
  });

  return null;
}

// Main Scene Component

function SceneComponent({
  isDarkMode,
  showSea,
  deviceInfo,
  onNavigateToConnect,
  onNavigateToPage,
  onPlayClickSound,
  isBurgerMenuOpen,
  triggerInitialZoom,
  showHomeButtons = true,
  homeButtonsIntroDelayMs = 0,
  focusPage = null,
  snapCamera = false,
}: SceneProps) {
  const [sceneLoaded, setSceneLoaded] = useState(false);
  // Labels wait until the camera has settled on the island view
  const [cameraAtHome, setCameraAtHome] = useState(false);
  const [hoveredSceneObject, setHoveredSceneObject] = useState<string | null>(null);
  const [dockOnScreen, setDockOnScreen] = useState<[number, number] | undefined>();

  // Opening or closing a page clears any hover left over from the click, so
  // the labels come back on the island without a highlight
  useEffect(() => {
    setHoveredSceneObject(null);
  }, [focusPage]);
  // Page chosen with the arrows on the island view; it follows whichever
  // page was opened last, so coming back shows the same one
  const [homePick, setHomePick] = useState<CarouselPage>('profile');
  useEffect(() => {
    if (focusPage) setHomePick(focusPage as CarouselPage);
  }, [focusPage]);
  const atHome = showHomeButtons && cameraAtHome;
  // Lit landmark: the open page's, or on the island view the chosen one.
  // At night it shines (light and glow); by day it brightens a little.
  const litObject = focusPage
    ? PAGE_OBJECT[focusPage] ?? null
    : atHome
    ? PAGE_OBJECT[homePick]
    : null;

  useEffect(() => {
    const timer = setTimeout(() => setSceneLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hoveredSceneObject) {
      document.body.style.cursor = 'default';
    }
  }, [hoveredSceneObject]);

  const handleNavigation = useCallback(
    (page: string) => {
      onPlayClickSound?.();
      const navigationMap = {
        skillset: () => onNavigateToPage?.('skillset'),
        connect: () => onNavigateToConnect?.(),
        profile: () => onNavigateToPage?.('profile'),
        portfolio: () => onNavigateToPage?.('portfolio'),
      };
      navigationMap[page as keyof typeof navigationMap]?.();
    },
    [onNavigateToPage, onNavigateToConnect, onPlayClickSound]
  );

  const createHoverHandler = useCallback((objectName: string) => {
    return (hovered: boolean) => {
      setHoveredSceneObject(hovered ? objectName : null);
    };
  }, []);

  const handleTwoChairsHover = createHoverHandler('twochairs');
  const handleHouseHover = createHoverHandler('house');
  const handleStoneHeadHover = createHoverHandler('stonehead');
  const handleSurfboardHover = createHoverHandler('surfboard');

  // Helper function to get responsive bounding boxes for better mobile interaction
  const getBoundingBox = (
    baseBox: [number, number, number]
  ): [number, number, number] => {
    if (deviceInfo?.isMobile) {
      // Make bounding boxes 30% larger on mobile for easier tapping
      return [baseBox[0] * 1.3, baseBox[1] * 1.3, baseBox[2] * 1.3];
    } else if (deviceInfo?.isTablet) {
      // Make bounding boxes 15% larger on tablet
      return [baseBox[0] * 1.15, baseBox[1] * 1.15, baseBox[2] * 1.15];
    }
    return baseBox; // Original size for desktop
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Scene Fade-in Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: isDarkMode ? '#000000' : '#ffffff',
          opacity: sceneLoaded ? 0 : 1,
          transition: 'opacity 1.2s ease-out',
          zIndex: 10,
          pointerEvents: sceneLoaded ? 'none' : 'all',
        }}
      />

      {/* Page carousel below the dock */}
      <PageCarousel
        isDarkMode={isDarkMode}
        deviceInfo={deviceInfo}
        anchor={dockOnScreen}
        selected={homePick}
        onSelect={setHomePick}
        onOpen={handleNavigation}
        onPlayClickSound={onPlayClickSound}
        isVisible={atHome}
        introDelayMs={homeButtonsIntroDelayMs}
      />

      {/* Reduce render load while menu is open */}
      <Canvas
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          background: 'transparent',
        }}
        frameloop='always'
        dpr={(() => {
          if (typeof window === 'undefined') return 1;
          const max = deviceInfo?.isMobile ? 1.5 : 2;
          return Math.min(window.devicePixelRatio || 1, max);
        })()}
        onCreated={({ gl }) => {
          // Better performance on mobile devices
          const max = deviceInfo?.isMobile ? 1.5 : 2;
          const pixelRatio = Math.min(window.devicePixelRatio || 1, max);
          gl.setPixelRatio(pixelRatio);

          // Ensure accurate color rendering
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
        }}
        onPointerMissed={() => {
          setTimeout(() => {
            document.body.style.cursor = 'default';
            setHoveredSceneObject(null);
          }, 100);
        }}
      >
        <SimpleSky key={`sky-${isDarkMode}`} isDarkMode={isDarkMode} />
        <Suspense fallback={null}>
          <LowPolyOcean isDarkMode={isDarkMode} deviceInfo={deviceInfo} />
        </Suspense>
        <SceneHaze isDarkMode={isDarkMode} />

        {/* Simplified lighting system */}
        {isDarkMode ? (
          <>
            <ambientLight intensity={0.45} color='#9fb2dd' />
            <directionalLight
              position={[-20, 40, 70]}
              intensity={0.8}
              color='#e6f3ff'
            />
            {/* Cool moonlight from the viewer's side so the island's front reads */}
            <directionalLight
              position={[-40, 60, -70]}
              intensity={1.1}
              color='#a9c1ff'
            />
          </>
        ) : (
          <>
            <ambientLight intensity={0.4} color='#fff5e6' />
            <directionalLight
              position={[20, 40, 15]}
              intensity={4.5}
              color='#fff8dc'
            />
          </>
        )}

        <Suspense fallback={null}>
          {/* Island Terrain */}
          <SimpleIsland
            key={`island-${isDarkMode}`}
            isDarkMode={isDarkMode}
            deviceInfo={deviceInfo}
          />

          {/* New Interactive Objects positioned above the island */}
          <InteractiveObject
            onHover={handleTwoChairsHover}
            onClick={() => handleNavigation('connect')}
            boundingBox={getBoundingBox([8, 8, 8])}
            position={[LANDMARK.chairs.x, 5, LANDMARK.chairs.z]}
            isDarkMode={isDarkMode}
            externalHovered={hoveredSceneObject === 'twochairs'}
            spotlight={litObject === 'twochairs'}
          >
            <SimpleTwoChairs
              key={`twochairs-${isDarkMode}`}
              isDarkMode={isDarkMode}
            />
          </InteractiveObject>

          <InteractiveObject
            onHover={handleHouseHover}
            onClick={() => handleNavigation('portfolio')}
            boundingBox={getBoundingBox([20, 16, 16])}
            position={[LANDMARK.house.x - 1, 8, LANDMARK.house.z]}
            isDarkMode={isDarkMode}
            externalHovered={hoveredSceneObject === 'house'}
            spotlight={litObject === 'house'}
          >
            <SimpleHouse key={`house-${isDarkMode}`} isDarkMode={isDarkMode} />
          </InteractiveObject>

          <InteractiveObject
            onHover={handleStoneHeadHover}
            onClick={() => handleNavigation('profile')}
            boundingBox={getBoundingBox([6, 5, 7])}
            position={[LANDMARK.dog.x, LANDMARK.dog.ground + 2, LANDMARK.dog.z]}
            isDarkMode={isDarkMode}
            externalHovered={hoveredSceneObject === 'stonehead'}
            spotlight={litObject === 'stonehead'}
          >
            <SimpleDog key={`dog-${isDarkMode}`} isDarkMode={isDarkMode} />
          </InteractiveObject>

          <InteractiveObject
            onHover={handleSurfboardHover}
            onClick={() => handleNavigation('skillset')}
            boundingBox={getBoundingBox([10, 7, 10])}
            position={[LANDMARK.desk.x, 3.5, LANDMARK.desk.z]}
            isDarkMode={isDarkMode}
            externalHovered={hoveredSceneObject === 'surfboard'}
            spotlight={litObject === 'surfboard'}
          >
            <SimpleComputerDesk
              key={`desk-${isDarkMode}`}
              isDarkMode={isDarkMode}
            />
          </InteractiveObject>

          {/* Set dressing */}
          <SimpleHammock isDarkMode={isDarkMode} />
          <IslandProps isDarkMode={isDarkMode} />

          {/* Lamp posts (non-interactive), lit at night */}
          {LAMPS.map((lamp, i) => (
            <SimpleIslandLamp
              key={`lamp${i}-${isDarkMode}`}
              isDarkMode={isDarkMode}
              position={lamp.position}
              rotation={[0, lamp.rotation, 0]}
              deviceInfo={deviceInfo}
            />
          ))}

          {/* Boat (non-interactive) */}
          <SimpleBoat
            isDarkMode={isDarkMode}
            isBurgerMenuOpen={isBurgerMenuOpen}
          />

          {/* Environmental Elements */}
          <SimpleClouds
            isDarkMode={isDarkMode}
            deviceInfo={deviceInfo}
            isBurgerMenuOpen={isBurgerMenuOpen}
          />

          {/* Ocean Waves - visible even when burger menu is open */}
          {showSea && (
            <SimpleOceanWaves
              isDarkMode={isDarkMode}
              isBurgerMenuOpen={isBurgerMenuOpen}
            />
          )}
        </Suspense>

        <AnimatedCamera
          onHomeChange={setCameraAtHome}
          deviceInfo={deviceInfo}
          triggerInitialZoom={triggerInitialZoom}
          focusPage={focusPage}
          snap={snapCamera}
        />

        <DockTracker onMove={setDockOnScreen} paused={!!focusPage} />
      </Canvas>
    </div>
  );
}

// Preload 3D models for better performance
useGLTF.preload('/models/object_island.glb');
useGLTF.preload('/models/object_boat.glb');
useGLTF.preload('/models/object_two_chairs.glb');
useGLTF.preload('/models/object_house.glb');
useGLTF.preload('/models/object_dog.glb');
useGLTF.preload('/models/object_hammock.glb');
ISLAND_PROPS.forEach((p) => useGLTF.preload(`/models/props/${p.file}.glb`));
useGLTF.preload('/models/object_computer_desk.glb');
useGLTF.preload('/models/object_island_lamp.glb');
useGLTF.preload('/models/object_cloud_puffy.glb');
useGLTF.preload('/models/object_cloud_stylized.glb');
// object_ocean_waves.glb is not preloaded: SimpleOceanWaves only renders when showSea is on, and loads it then

export default React.memo(SceneComponent);
