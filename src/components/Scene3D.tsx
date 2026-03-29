"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PointMaterial, Points } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

// ── Animated neon grid floor ──────────────────────────────────────
function NeonGrid() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.z += delta * 1.5;
      if (ref.current.position.z > 2) {
        ref.current.position.z = 0;
      }
    }
  });

  return (
    <gridHelper
      ref={ref}
      args={[120, 80, "#ff3b3b", "#220808"]}
      position={[0, -0.5, 0]}
    />
  );
}

// ── Single floating mine ──────────────────────────────────────────
interface MineProps {
  position: [number, number, number];
  speed: number;
  rotationSpeed: number;
  amplitude: number;
  phase: number;
  scale: number;
  hasLight: boolean;
}

function FloatingMine({ position, speed, rotationSpeed, amplitude, phase, scale, hasLight }: MineProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseY = position[1];

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed * 0.01;
      meshRef.current.rotation.z += rotationSpeed * 0.007;
      meshRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * speed + phase) * amplitude;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} scale={scale}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          emissive="#ff3b3b"
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {/* Spikes */}
      {[
        [0, 0.6, 0], [0, -0.6, 0],
        [0.6, 0, 0], [-0.6, 0, 0],
        [0, 0, 0.6], [0, 0, -0.6],
      ].map((dir, i) => (
        <mesh
          key={i}
          position={[dir[0] * scale, dir[1] * scale + (meshRef.current?.position.y ?? 0) - baseY, dir[2] * scale]}
          scale={scale}
        >
          <coneGeometry args={[0.06, 0.25, 4]} />
          <meshStandardMaterial color="#333" emissive="#ff3b3b" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {hasLight && (
        <pointLight color="#ff3b3b" intensity={2} distance={4} decay={2} />
      )}
    </group>
  );
}

// ── All mines ─────────────────────────────────────────────────────
function FloatingMines() {
  const mines = useMemo(() => {
    const result: MineProps[] = [];
    for (let i = 0; i < 12; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * 18,
          1 + Math.random() * 4,
          (Math.random() - 0.5) * 16 - 2,
        ],
        speed: 0.5 + Math.random() * 0.8,
        rotationSpeed: 0.3 + Math.random() * 0.5,
        amplitude: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.5,
        hasLight: i < 4,
      });
    }
    return result;
  }, []);

  return (
    <>
      {mines.map((mine, i) => (
        <FloatingMine key={i} {...mine} />
      ))}
    </>
  );
}

// ── Dust particles ────────────────────────────────────────────────
function DustParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.3;
      if (arr[i * 3 + 1] > 12) {
        arr[i * 3 + 1] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 25;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ff3b3b"
        size={0.03}
        sizeAttenuation
        depthWrite={false}
        opacity={0.5}
      />
    </Points>
  );
}

// ── Green data particles ──────────────────────────────────────────
function DataParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 150;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = Math.random() * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t + i) * 0.002;
    }
    pos.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00ff88"
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        opacity={0.3}
      />
    </Points>
  );
}

// ── Main scene ────────────────────────────────────────────────────
function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 10, 5]} intensity={0.2} color="#ff3b3b" />
      <directionalLight position={[-3, 8, -5]} intensity={0.1} color="#3b8bff" />
      <fog attach="fog" args={["#0a0a0a", 6, 22]} />

      <NeonGrid />
      <FloatingMines />
      <DustParticles />
      <DataParticles />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function Scene3D() {
  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 6, 14], fov: 55, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
