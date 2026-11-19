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
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import ObjectPopupMenu from './ObjectPopupMenu';

interface SceneProps {
  isDarkMode: boolean;
  showIsland: boolean;
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

// Component to apply brightness effect on hover
function ObjectBrightness({
  object,
  isHovered,
  isDarkMode,
}: {
  object: any;
  isHovered: boolean;
  isDarkMode?: boolean;
}) {
  const originalMaterials = useRef<Map<any, any>>(new Map());

  useEffect(() => {
    if (!object) return;

    object.traverse((child: any) => {
      if (child.isMesh && child.material) {
        // Store original material properties
        if (!originalMaterials.current.has(child.material)) {
          const original = {
            color: child.material.color.clone(),
            emissive: child.material.emissive
              ? child.material.emissive.clone()
              : null,
            emissiveIntensity: child.material.emissiveIntensity || 0,
          };
          originalMaterials.current.set(child.material, original);
        }

        const original = originalMaterials.current.get(child.material);

        if (isHovered) {
          // Apply balanced brightness effect that won't cause disappearing
          const colorMultiplier = isDarkMode ? 2.2 : 1.4; // Reduced multipliers to prevent overexposure
          const emissiveMultiplier = isDarkMode ? 2.0 : 1.2;
          const emissiveBoost = isDarkMode ? 0.5 : 0.2;

          child.material.color
            .copy(original.color)
            .multiplyScalar(colorMultiplier);

          if (child.material.emissive && original.emissive) {
            child.material.emissive
              .copy(original.emissive)
              .multiplyScalar(emissiveMultiplier);
          }

          if ('emissiveIntensity' in child.material) {
            child.material.emissiveIntensity = Math.min(
              isDarkMode ? 1.5 : 1.0, // Reduced max values to prevent overexposure
              original.emissiveIntensity + emissiveBoost
            );
          }
        } else {
          // Restore original properties
          child.material.color.copy(original.color);
          if (child.material.emissive && original.emissive) {
            child.material.emissive.copy(original.emissive);
          }
          if ('emissiveIntensity' in child.material) {
            child.material.emissiveIntensity = original.emissiveIntensity;
          }
        }

        child.material.needsUpdate = true;
      }
    });
  }, [object, isHovered, isDarkMode]);

  return null;
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
}: InteractiveObjectProps & { isDarkMode?: boolean; spotlight?: boolean }) {
  const timeoutRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const objectRef = useRef<any>(null);

  const handlePointerEnter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.body.style.cursor = 'pointer';
      setIsHovered(true);
      onHover(true);
    },
    [onHover]
  );

  const handlePointerLeave = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      // Remove timeout - keep brightness while cursor is on object
      document.body.style.cursor = 'default';
      setIsHovered(false);
      onHover(false);
    },
    [onHover]
  );

  // Cleanup effect no longer needed since we removed setTimeout

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
      {/* Light over the landmark whose page is open */}
      {spotlight && (
        <pointLight
          position={[position[0], position[1] + 10, position[2] - 6]}
          color={isDarkMode ? '#ffe2a8' : '#fff6e0'}
          intensity={isDarkMode ? 260 : 140}
          distance={34}
          decay={1.5}
        />
      )}
      <ObjectBrightness
        object={objectRef.current}
        isHovered={isHovered || externalHovered}
        isDarkMode={isDarkMode}
      />
    </group>
  );
}

// Utility Functions

interface MaterialSettings {
  isLight?: boolean;
  isNatural?: boolean;
  isWood?: boolean;
  isMetal?: boolean;
  isCrystal?: boolean;
  fallbackColor?: { r: number; g: number; b: number };
  emissiveColor?: string;
  emissiveIntensity?: number;
}

function applyMaterialSettings(
  material: any,
  isDarkMode: boolean,
  settings: MaterialSettings = {}
) {
  if (!material?.color) return;

  const {
    isLight = false,
    isNatural = false,
    isWood = false,
    isMetal = false,
    isCrystal = false,
    fallbackColor = { r: 0.6, g: 0.5, b: 0.4 },
    emissiveColor = '#000000',
    emissiveIntensity = 0,
  } = settings;

  // Set material properties
  if ('roughness' in material) {
    material.roughness = isCrystal
      ? 0.1
      : isNatural
      ? 0.8
      : isMetal
      ? 0.3
      : 0.7;
  }
  if ('metalness' in material) {
    material.metalness = isCrystal
      ? 0.8
      : isMetal
      ? 0.7
      : isNatural
      ? 0.0
      : 0.1;
  }

  // Store original color once
  if (!material.userData) material.userData = {};
  if (!material.userData.originalColor) {
    const brightness = material.color.r + material.color.g + material.color.b;
    const isOverBright =
      brightness > 2.8 ||
      (material.color.r > 0.95 &&
        material.color.g > 0.95 &&
        material.color.b > 0.95);

    material.userData.originalColor = isOverBright
      ? fallbackColor
      : {
          r: material.color.r,
          g: material.color.g,
          b: material.color.b,
        };
  }

  // Reset to original color
  const { r, g, b } = material.userData.originalColor;
  material.color.setRGB(r, g, b);

  // Apply lighting effects
  if (isDarkMode) {
    if (isLight || isCrystal) {
      if (material.emissive?.setHex) material.emissive.setHex(emissiveColor);
      if ('emissiveIntensity' in material)
        material.emissiveIntensity = emissiveIntensity || 1.0;
      if (isCrystal && material.emissive?.copy)
        material.emissive.copy(material.color);
    } else {
      if (material.emissive?.setHex) material.emissive.setHex(0x000000);
      if ('emissiveIntensity' in material) material.emissiveIntensity = 0;
    }
  } else {
    // Sunlight brightness
    const brightFactor = isNatural ? 2.2 : isWood ? 1.8 : isMetal ? 1.6 : 1.9;
    material.color.multiplyScalar(brightFactor);

    // Add warm sunlight tint
    if (!isLight && !isCrystal) {
      const warmTint = isNatural ? 0.05 : 0.03;
      material.color.r = Math.min(1.0, material.color.r + warmTint);
      material.color.g = Math.min(1.0, material.color.g + warmTint * 0.8);
    }

    if (material.emissive?.setHex) material.emissive.setHex(0x000000);
    if ('emissiveIntensity' in material) material.emissiveIntensity = 0;
  }

  if ('needsUpdate' in material) material.needsUpdate = true;
}

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

function processSceneNode(
  scene: any,
  isDarkMode: boolean,
  materialProcessor: (node: any, material: any) => void
) {
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
          if (material) materialProcessor(node, material);
        });
      } catch (error) {
        console.warn('Error processing material:', error);
      }
    }
  });

  return clonedScene;
}

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

  const clonedScene = useMemo(() => processSceneNode(scene, isDarkMode, (node, material) => {
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

  // Handle case where scene processing failed
  if (!clonedScene) {
    return null;
  }

  return (
    <primitive
      object={clonedScene}
      position={[0, -2, 0]}
      scale={getIslandScale()}
    />
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

// Which way the boat points (radians around the vertical axis)
const BOAT_HEADING = -0.3; // bow turned toward the viewer, so it takes little width
// Height that keeps the hull sitting on the water rather than in it
const BOAT_WATERLINE = 1.2;

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
      boatRef.current.position.y = BOAT_WATERLINE + Math.sin(time * 0.8) * 0.3;
    }
  });

  if (!scene) {
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

  const clonedScene = useMemo(() => processSceneNode(scene, isDarkMode, (node, material) => {
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
      position={[-21, 1.2, -50]} // moored to the right of the dock, clear of the shore
      scale={[8.8, 8.8, 8.8]} // ~7.5 m fishing boat
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

  if (!scene) {
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

  const clonedScene = useMemo(
    () =>
      processSceneNode(scene, isDarkMode, (node, material) => {
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
      position={[-23, 0.5, -15]}
      scale={[2, 2, 2]}
      rotation={[0, 2.5, 0]}
    />
  );
}

function SimpleHouse({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_house.glb');

  if (!scene) {
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

  const clonedScene = useMemo(
    () =>
      processSceneNode(scene, isDarkMode, (node, material) => {
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
      position={[15, 0, 15]}
      scale={[2.4, 2.4, 2.4]} // beach house on stilts, the island's main building
      rotation={[0, 3.75, 0]}
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
      const material = child.material;
      if (isDarkMode) {
        // Light the texture from within, warm like a lantern
        material.emissive?.set?.('#ffcf7a');
        if (material.map) material.emissiveMap = material.map;
        material.emissiveIntensity = 1.15;
        material.color.multiplyScalar(0.6);
      } else {
        material.emissive?.setHex?.(0x000000);
        material.emissiveIntensity = 0;
        material.roughness = 0.8;
      }
      material.needsUpdate = true;
    });
    return fitToSize(processed, 4); // a large dog, slightly over life size
  }, [scene, isDarkMode]);

  if (!object) return null;

  return (
    <group position={[20, 1.1, -10]} rotation={[0, 3.6, 0]}>
      <primitive object={object} />
      {isDarkMode && (
        <>
          <pointLight
            position={[0, 2.5, -1.5]}
            color='#ffc66b'
            intensity={45}
            distance={18}
            decay={1.6}
          />
          <sprite position={[0, 1.5, 0]} scale={[7, 7, 1]}>
            <spriteMaterial
              map={getHaloTexture()}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.55}
            />
          </sprite>
        </>
      )}
    </group>
  );
}

// The computer desk replaces the surfboards (Skillset).
function SimpleComputerDesk({ isDarkMode }: { isDarkMode: boolean }) {
  const { scene } = useGLTF('/models/object_computer_desk.glb');

  const object = useMemo(() => {
    const processed = processSceneNode(scene, isDarkMode, (_node, material) => {
      material.color.multiplyScalar(isDarkMode ? 0.3 : 1.6);
      material.needsUpdate = true;
    });
    return processed ? fitToSize(processed, 8.5) : null; // desk + office chair
  }, [scene, isDarkMode]);

  if (!object) return null;

  return (
    <group position={[-16, 0.5, 12]} rotation={[0, 3.3, 0]}>
      <primitive object={object} />
    </group>
  );
}

// How far out the shoreline sits, as a share of the island model's radius
const SHORE_FIT = 0.86;

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

  if (!scene) {
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

  const clonedScene = useMemo(() => processSceneNode(scene, isDarkMode, (node, material) => {
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
    <primitive
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={getLampScale()}
    />
  );
}

// Environment (Sky, Sea, Camera)

// Port Jeffrey's own palette. Day: an airy blue sky that warms to a cream
// horizon over a bright cerulean sea, in the same blue-teal family as the
// UI. Night: deep navy sky and sea, matching the night UI.
const PALETTE = {
  light: {
    skyTop: '#8fcbef',
    horizon: '#fdf2e2',
    sea: '#2394bf', // bright cerulean, same hue family as the UI teal
    shallow: '#2394bf',
    foam: '#f2fdff',
    sunDir: [-0.75, 0.13, 1] as [number, number, number],
    sunColor: '#fff1d6',
  },
  dark: {
    skyTop: '#070d24',
    horizon: '#2b2d5c',
    sea: '#162542', // the site's night navy
    shallow: '#162542',
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

// Animated ocean: a gentle swell moves the surface, fine ripples are added
// per pixel, distant water reflects the sky, and the ripples break the
// sun (or moon) into a glittering path. Calm near the beach.
const OCEAN_SWELLS = `
  // direction.xy, frequency, speed ; amplitude in w
  const int SWELLS = 3;
  const vec4 SWELL[3] = vec4[3](
    vec4(1.0, 0.35, 0.045, 0.9),
    vec4(-0.45, 1.0, 0.07, 1.2),
    vec4(0.8, -0.7, 0.12, 1.7)
  );
  // longer, slightly taller swells
  const float SWELL_AMP[3] = float[3](0.85, 0.48, 0.24);
`;

const OCEAN_VERTEX = `
  uniform float uTime;
  uniform vec4 uShore; // centre x, centre z, radius x, radius z
  varying vec3 vWorld;
  varying float vShore;
  varying float vCalm;
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
    vShore = d;
    vCalm = calm;
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
  varying float vShore;
  varying float vCalm;
  ${OCEAN_SWELLS}
  #include <fog_pars_fragment>

  // slope of a sine wave train, added up into a surface normal
  void addWave(inout vec2 slope, vec2 p, vec2 dir, float k, float speed, float amp) {
    dir = normalize(dir);
    slope += dir * cos(dot(p, dir) * k + uTime * speed) * amp * k;
  }

  void main() {
    vec2 p = vWorld.xz;
    vec2 slope = vec2(0.0);
    // the big swell (same as the vertex shader)
    for (int i = 0; i < SWELLS; i++) {
      addWave(slope, p, SWELL[i].xy, SWELL[i].z, SWELL[i].w, SWELL_AMP[i] * vCalm);
    }
    // fine ripples, several directions so they never line up
    float rip = 0.4 + 0.35 * vCalm;
    // two gentle ripple sets, faded with distance so far water doesn't
    // turn into fine stripes
    float near = 1.0 - smoothstep(60.0, 200.0, distance(cameraPosition.xz, p));
    addWave(slope, p, vec2(0.9, 0.4), 0.45, 1.5, 0.07 * rip * near);
    addWave(slope, p, vec2(-0.6, 0.8), 0.7, -1.9, 0.05 * rip * near);
    vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

    vec3 v = normalize(cameraPosition - vWorld);
    float facing = max(dot(n, v), 0.0);

    // one even water colour (no lighter patch around the island)
    vec3 water = uDeep;
    water *= 0.85 + 0.25 * max(dot(n, normalize(vec3(0.4, 1.0, -0.3))), 0.0);

    // reflection of the sky, stronger at grazing angles (far away)
    vec3 r = reflect(-v, n);
    vec3 sky = mix(uHorizon, uSkyTop, smoothstep(0.0, 0.45, r.y));
    float fresnel = 0.02 + 0.35 * pow(1.0 - facing, 5.0);
    vec3 col = mix(water, sky, fresnel);

    // sun / moon glitter on the ripples
    float glint = pow(max(dot(r, normalize(uSunDir)), 0.0), 300.0);
    float sheen = pow(max(dot(r, normalize(uSunDir)), 0.0), 24.0);
    // the moon's path is softer than the sun's
    col += uSunColor * (glint * 1.4 + sheen * 0.1) * (1.0 - 0.55 * uNight);

    gl_FragColor = vec4(col, 1.0);
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

  if (!scene) {
    // Fallback - create a simple animated plane if model fails to load
    return (
      <group ref={wavesRef} position={[0, -2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2000, 1000, 1]}>
          <planeGeometry args={[1, 1, 32, 32]} />
          <meshStandardMaterial
            color={isDarkMode ? '#000a0f' : '#1a4d66'}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>
    );
  }

  const clonedScene = processSceneNode(scene, isDarkMode, (node, material) => {
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
  connect: new THREE.Vector3(-23, 3, -15),
  portfolio: new THREE.Vector3(15, 7.5, 15),
  profile: new THREE.Vector3(20, 2.5, -10),
  skillset: new THREE.Vector3(-16, 2.8, 12),
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
const UP = new THREE.Vector3(0, 1, 0);

// Camera that eases in on load, flies to a landmark when its page opens,
// and flies back to the island view when the page closes.
function AnimatedCamera({
  deviceInfo,
  triggerInitialZoom = false,
  focusPage = null,
}: {
  deviceInfo?: any;
  triggerInitialZoom?: boolean;
  focusPage?: string | null;
}) {
  const cameraRef = useRef<any>(null);
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
    const drawerShare = isPortraitPhone
      ? 0
      : deviceInfo?.isLandscapeMobile ||
        (deviceInfo?.isMobile && deviceInfo?.orientation === 'landscape')
      ? 0.58
      : deviceInfo?.isTablet && deviceInfo?.orientation === 'portrait'
      ? 0.62
      : 0.5;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cameraSettings.fov / 2));
    const filmTarget =
      drawerSide * (drawerShare / 2) * 2 * tanHalf * camera.aspect * camera.getFilmWidth();

    // Each new destination starts a fresh tween from wherever the camera is,
    // eased in and out so it never jumps or snaps to a stop.
    const key = focusPage ?? 'home';
    const tw = tween.current;
    if (tw.key !== key) {
      tw.key = key;
      tw.elapsed = 0;
      tw.duration = introDone.current ? 1.4 : 3;
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

// Screen Position Tracker Component
// Only pushes new positions when a label actually moves on screen (or the
// scene would re-render every frame), and pauses while zoomed into a page.
function ScreenPositionTracker({
  onUpdatePositions,
  paused = false,
}: {
  onUpdatePositions: (positions: Record<string, [number, number]>) => void;
  paused?: boolean;
}) {
  const { camera, size } = useThree();
  const last = useRef<Record<string, [number, number]>>({});

  // Object positions in 3D world space (matching InteractiveObject positions)
  const objectPositions = {
    twochairs: new THREE.Vector3(-23, 0.5, -15),
    house: new THREE.Vector3(15, 0, 15),
    stonehead: new THREE.Vector3(20, -1, -10),
    surfboard: new THREE.Vector3(-16, 2, 12),
  };

  useFrame(() => {
    const screenPositions: Record<string, [number, number]> = {};

    Object.entries(objectPositions).forEach(([key, worldPos]) => {
      // Clone the position to avoid modifying the original
      const pos = worldPos.clone();

      // Project 3D position to 2D screen coordinates
      pos.project(camera);

      // Convert from normalized device coordinates to pixel coordinates
      const x = (pos.x * 0.5 + 0.5) * size.width;
      const y = (pos.y * -0.5 + 0.5) * size.height;

      screenPositions[key] = [x, y];
    });

    if (paused) return;
    const moved = Object.entries(screenPositions).some(([key, [x, y]]) => {
      const prev = last.current[key];
      return !prev || Math.abs(prev[0] - x) > 0.5 || Math.abs(prev[1] - y) > 0.5;
    });
    if (!moved) return;
    last.current = screenPositions;
    onUpdatePositions(screenPositions);
  });

  return null; // This component doesn't render anything
}

// Main Scene Component

function SceneComponent({
  isDarkMode,
  showIsland,
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
}: SceneProps) {
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [hoveredSceneObject, setHoveredSceneObject] = useState<string | null>(null);
  const [hoveredButtonObject, setHoveredButtonObject] = useState<string | null>(
    null
  );
  const [objectScreenPositions, setObjectScreenPositions] = useState<
    Record<string, [number, number]>
  >({});
  const activeHoveredObject = hoveredButtonObject || hoveredSceneObject;
  // The landmark for the open page stays lit until the page closes
  const litObject = focusPage ? PAGE_OBJECT[focusPage] ?? null : null;

  useEffect(() => {
    const timer = setTimeout(() => setSceneLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!activeHoveredObject) {
      document.body.style.cursor = 'default';
    }
  }, [activeHoveredObject]);

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

      {/* Object Popup Menu */}
      <ObjectPopupMenu
        isDarkMode={isDarkMode}
        deviceInfo={deviceInfo}
        objectPositions={objectScreenPositions}
        onNavigate={handleNavigation}
        onHoverObject={setHoveredButtonObject}
        highlightedObject={hoveredSceneObject}
        isVisible={showHomeButtons}
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
            position={[-23, 5, -15]}
            isDarkMode={isDarkMode}
            externalHovered={activeHoveredObject === 'twochairs' || litObject === 'twochairs'}
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
            position={[14, 8, 15]}
            isDarkMode={isDarkMode}
            externalHovered={activeHoveredObject === 'house' || litObject === 'house'}
            spotlight={litObject === 'house'}
          >
            <SimpleHouse key={`house-${isDarkMode}`} isDarkMode={isDarkMode} />
          </InteractiveObject>

          <InteractiveObject
            onHover={handleStoneHeadHover}
            onClick={() => handleNavigation('profile')}
            boundingBox={getBoundingBox([6, 5, 7])}
            position={[20, 3, -10]}
            isDarkMode={isDarkMode}
            externalHovered={activeHoveredObject === 'stonehead' || litObject === 'stonehead'}
            spotlight={litObject === 'stonehead'}
          >
            <SimpleDog key={`dog-${isDarkMode}`} isDarkMode={isDarkMode} />
          </InteractiveObject>

          <InteractiveObject
            onHover={handleSurfboardHover}
            onClick={() => handleNavigation('skillset')}
            boundingBox={getBoundingBox([10, 7, 10])}
            position={[-16, 3.5, 12]}
            isDarkMode={isDarkMode}
            externalHovered={activeHoveredObject === 'surfboard' || litObject === 'surfboard'}
            spotlight={litObject === 'surfboard'}
          >
            <SimpleComputerDesk
              key={`desk-${isDarkMode}`}
              isDarkMode={isDarkMode}
            />
          </InteractiveObject>

          {/* Island Lamps (non-interactive) - positioned around the island */}
          <SimpleIslandLamp
            key={`lamp1-${isDarkMode}`}
            isDarkMode={isDarkMode}
            position={[17.5, 0.5, 0]}
            rotation={[0, 1, 0]}
            deviceInfo={deviceInfo}
          />
          <SimpleIslandLamp
            key={`lamp2-${isDarkMode}`}
            isDarkMode={isDarkMode}
            position={[-5, 0.5, 20]}
            rotation={[0, 5.5, 0]}
            deviceInfo={deviceInfo}
          />
          <SimpleIslandLamp
            key={`lamp3-${isDarkMode}`}
            isDarkMode={isDarkMode}
            position={[-25, 0.5, 0]}
            rotation={[0, 5.5, 0]}
            deviceInfo={deviceInfo}
          />

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
          deviceInfo={deviceInfo}
          triggerInitialZoom={triggerInitialZoom}
          focusPage={focusPage}
        />

        {/* Screen Position Tracker */}
        <ScreenPositionTracker
          onUpdatePositions={setObjectScreenPositions}
          paused={!!focusPage}
        />
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
useGLTF.preload('/models/object_computer_desk.glb');
useGLTF.preload('/models/object_island_lamp.glb');
useGLTF.preload('/models/object_cloud_puffy.glb');
useGLTF.preload('/models/object_cloud_stylized.glb');
// object_ocean_waves.glb is not preloaded: SimpleOceanWaves only renders when showSea is on, and loads it then

export default React.memo(SceneComponent);
