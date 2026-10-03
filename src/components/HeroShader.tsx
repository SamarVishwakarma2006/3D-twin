"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ShaderMaterial } from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.075;
    uv.x += sin(uv.y * 5.0 + t) * 0.035;
    uv.y += cos(uv.x * 4.0 - t * 1.2) * 0.035;
    float blue = exp(-length((uv - vec2(0.68, 0.53)) * vec2(1.0, 1.25)) * 4.0);
    float cyan = exp(-length((uv - vec2(0.91, 0.69)) * vec2(1.0, 1.6)) * 5.0);
    float violet = exp(-length((uv - vec2(0.58, 0.87)) * vec2(1.0, 1.4)) * 5.0);
    vec3 color = vec3(0.015, 0.022, 0.045);
    color += blue * vec3(0.035, 0.105, 0.35);
    color += cyan * vec3(0.025, 0.18, 0.24);
    color += violet * vec3(0.12, 0.045, 0.2);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function ShaderPlane({ animated }: { animated: boolean }) {
  const { viewport } = useThree();
  const material = useRef<ShaderMaterial>(null!);
  useFrame((_, delta) => {
    if (animated && material.current)
      material.current.uniforms.uTime.value += delta;
  });
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function HeroShader() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimated(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className="hero-shader-wrap" aria-hidden="true">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        dpr={[1, 1.5]}
        frameloop={animated ? "always" : "demand"}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      >
        <ShaderPlane animated={animated} />
      </Canvas>
    </div>
  );
}
