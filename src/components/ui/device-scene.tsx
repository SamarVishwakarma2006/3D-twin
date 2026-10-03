"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  Group,
  MeshStandardMaterial,
  LineSegments,
  BufferAttribute,
  LineBasicMaterial,
} from "three";
import { smartphone } from "../../data/smartphone";
import { PartDetail } from "../PartDetail";
import type { Component } from "../../lib/product";
import { poseAt, heroSimulation } from "./device-timeline";

type Props = {
  coordinate: RefObject<number>;
  selected: string;
  running: boolean;
  onFailure: () => void;
  fallback: ReactNode;
};
function DevicePart({
  part,
  coordinate,
  selected,
}: { part: Component } & Pick<Props, "coordinate" | "selected">) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (!group.current || !material.current) return;
    const pose = poseAt(coordinate.current);
    const opacity = part.geometry.exterior ? pose[6] : 1;
    group.current.position.set(
      ...(part.geometry.position.map(
        (p, i) => p + part.geometry.explodedOffset[i] * pose[5],
      ) as [number, number, number]),
    );
    // Fade the locally generated detail textures along with the outer shell.
    group.current.traverse((object) => {
      const child = object as typeof object & {
        material?: MeshStandardMaterial;
      };
      if (child.material) {
        child.material.opacity = opacity;
        child.material.depthWrite = opacity > 0.5;
      }
    });
    const sim = Math.max(0, 1 - Math.abs(coordinate.current - 4));
    const affected = heroSimulation.statuses[part.id] !== "healthy";
    const highlighted = Math.max(0, 1 - Math.abs(coordinate.current - 2));
    material.current.emissive.set(
      affected && sim > 0.1 ? "#d58d35" : "#89d9c1",
    );
    material.current.emissiveIntensity = affected ? sim * 0.48 : 0;
    if (part.id === selected)
      material.current.emissiveIntensity += highlighted * 0.45;
  });
  return (
    <group ref={group} position={part.geometry.position}>
      <RoundedBox
        args={part.geometry.size}
        radius={Math.min(...part.geometry.size) / 3}
        smoothness={4}
      >
        <meshStandardMaterial
          ref={material}
          color={part.id === "housing" ? "#556477" : part.geometry.color}
          metalness={part.geometry.exterior ? 0.8 : 0.35}
          roughness={part.geometry.exterior ? 0.23 : 0.46}
          transparent
        />
      </RoundedBox>
      <PartDetail component={part} opacity={1} />
    </group>
  );
}
function Assembly({ coordinate, selected, onFailure }: Props) {
  const group = useRef<Group>(null);
  const lines = useRef<LineSegments>(null);
  const { viewport, gl } = useThree();
  const compact = useRef(false);
  useEffect(() => {
    const media = matchMedia("(max-width: 700px)");
    const sync = () => {
      compact.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const positions = useMemo(
    () => new Float32Array(smartphone.dependencies.length * 6),
    [],
  );
  const nodes = useMemo(
    () => new Map(smartphone.components.map((p) => [p.id, p])),
    [],
  );
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useFrame(({ clock, pointer }, delta) => {
    if (!group.current || !lines.current) return;
    const pose = poseAt(coordinate.current);
    const portrait = compact.current;
    const fit = portrait
      ? Math.min(viewport.width / 6, viewport.height / 9)
      : Math.min(viewport.height / 8.4, viewport.width / 16);
    group.current.scale.setScalar(fit * pose[3]);
    group.current.position.set(
      portrait ? 0 : viewport.width * (0.16 + pose[4] * 0.1),
      portrait ? 0 : 0.05,
      0,
    );
    const idle = Math.sin(clock.elapsedTime * 0.22) * 0.035;
    const easing = 1 - Math.exp(-Math.min(delta, 0.1) * 8);
    group.current.rotation.x +=
      (pose[0] + pointer.y * 0.025 - group.current.rotation.x) * easing;
    group.current.rotation.y +=
      (pose[1] + idle + pointer.x * 0.055 - group.current.rotation.y) * easing;
    group.current.rotation.z += (pose[2] - group.current.rotation.z) * easing;
    const attribute = lines.current.geometry.getAttribute(
      "position",
    ) as BufferAttribute;
    smartphone.dependencies.forEach((edge, i) => {
      [edge.sourceComponentId, edge.targetComponentId].forEach((id, j) => {
        const part = nodes.get(id)!;
        attribute.setXYZ(
          i * 2 + j,
          ...(part.geometry.position.map(
            (p, k) =>
              p +
              part.geometry.explodedOffset[k] * pose[5] +
              (k === 2 ? 0.24 : 0),
          ) as [number, number, number]),
        );
      });
    });
    attribute.needsUpdate = true;
    const mat = lines.current.material as LineBasicMaterial;
    mat.opacity =
      Math.max(0, 1 - Math.abs(coordinate.current - 3)) *
      (0.5 + Math.sin(clock.elapsedTime * 2) * 0.12);
  });
  return (
    <group ref={group}>
      {smartphone.components.map((part) => (
        <DevicePart
          key={part.id}
          part={part}
          coordinate={coordinate}
          selected={selected}
        />
      ))}
      <lineSegments ref={lines} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#89d9c1"
          transparent
          opacity={0}
          depthTest={false}
        />
      </lineSegments>
    </group>
  );
}
export default function DeviceScene(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 36 }}
      style={{ touchAction: "pan-y" }}
      dpr={[1, 1.5]}
      frameloop={props.running ? "always" : "demand"}
      gl={{ alpha: true, antialias: true }}
      fallback={props.fallback}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 5, 8]} intensity={4} color="#dce9ff" />
      <directionalLight position={[-5, 1, 3]} intensity={2.5} color="#789eff" />
      <directionalLight position={[0, -4, -4]} intensity={3} color="#89d9c1" />
      <Assembly {...props} />
    </Canvas>
  );
}
