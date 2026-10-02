"use client";
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Component } from "../lib/product";

/** Lightweight markings generated locally: no font, image or texture downloads. */
export function PartDetail({
  component,
  opacity,
}: {
  component: Component;
  opacity: number;
}) {
  const { size, detail } = component.geometry;
  const texture = useMemo(() => {
    if (!detail) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 512);
    if (detail === "battery") {
      ctx.fillStyle = "#423e32";
      ctx.font = "bold 25px Arial";
      ctx.fillText("ENERGY", 25, 60);
      ctx.fillText("MODULE", 25, 90);
      ctx.font = "14px Arial";
      ctx.fillText("ILLUSTRATIVE CELL", 25, 128);
      ctx.fillText("DT–01 / DEMO", 25, 153);
      ctx.strokeStyle = "#625941";
      ctx.lineWidth = 2;
      ctx.strokeRect(23, 186, 205, 130);
      ctx.font = "13px Arial";
      ctx.fillText("Li-ion", 42, 224);
      ctx.fillText("SERVICE BY", 42, 257);
      ctx.fillText("QUALIFIED PERSONNEL", 42, 281);
      for (let i = 0; i < 35; i++) {
        ctx.fillRect(25 + i * 5, 365, 1 + (i % 3), 43);
      }
      ctx.fillText("NOT A REAL BATTERY", 25, 452);
    } else if (detail === "screen") {
      ctx.fillStyle = "#0d1a22";
      ctx.fillRect(0, 0, 256, 512);
      ctx.fillStyle = "#263d48";
      ctx.fillRect(25, 80, 206, 310);
      ctx.strokeStyle = "#77c7b3";
      ctx.lineWidth = 2;
      ctx.strokeRect(63, 165, 130, 130);
      ctx.strokeRect(79, 181, 98, 98);
      ctx.fillStyle = "#c3e6dd";
      ctx.font = "24px Arial";
      ctx.fillText("inside /", 86, 236);
      ctx.font = "10px Arial";
      ctx.fillText("DIGITAL TWIN / DT–01", 68, 327);
      ctx.fillStyle = "#05090c";
      ctx.beginPath();
      ctx.roundRect(98, 13, 60, 10, 5);
      ctx.fill();
      ctx.fillStyle = "#93aaa9";
      ctx.fillRect(104, 485, 48, 3);
    } else if (detail === "circuit") {
      ctx.strokeStyle = "#91af7e";
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.moveTo(10 + i * 17, 12);
        ctx.lineTo(10 + i * 17, 60 + i * 25);
        ctx.lineTo(25 + i * 15, 80 + i * 25);
        ctx.lineTo(25 + i * 15, 495);
        ctx.stroke();
      }
      ctx.fillStyle = "#d1c08a";
      for (let i = 0; i < 16; i++) {
        ctx.fillRect(8 + i * 15, 470, 7, 28);
        ctx.fillRect(8 + i * 15, 4, 7, 22);
      }
    } else if (detail === "chip") {
      ctx.fillStyle = "#1b252c";
      ctx.fillRect(20, 40, 216, 432);
      ctx.fillStyle = "#b9c4ce";
      ctx.font = "30px Arial";
      ctx.fillText("SoC", 95, 255);
      ctx.font = "17px Arial";
      ctx.fillText("DEMO", 96, 294);
    } else if (detail === "grille") {
      ctx.fillStyle = "#18222c";
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.roundRect(15 + i * 27, 55, 12, 400, 6);
        ctx.fill();
      }
    } else if (detail === "port") {
      ctx.fillStyle = "#17212a";
      ctx.beginPath();
      ctx.roundRect(12, 80, 232, 350, 80);
      ctx.fill();
      ctx.fillStyle = "#a9a39a";
      ctx.fillRect(45, 235, 168, 30);
    }
    const image = new CanvasTexture(canvas);
    image.colorSpace = SRGBColorSpace;
    return image;
  }, [detail]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (detail === "lens")
    return (
      <group position={[0, 0, size[2] / 2 + 0.01]}>
        <mesh>
          <cylinderGeometry args={[size[0] * 0.4, size[0] * 0.4, 0.04, 24]} />
          <meshStandardMaterial color="#141a24" transparent opacity={opacity} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[size[0] * 0.3, 24, 16]} />
          <meshStandardMaterial
            color="#101f36"
            metalness={0.65}
            roughness={0.12}
            transparent
            opacity={opacity}
          />
        </mesh>
      </group>
    );
  if (!texture) return null;
  return (
    <mesh position={[0, 0, size[2] / 2 + 0.006]}>
      <planeGeometry args={[size[0] * 0.92, size[1] * 0.94]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={opacity > 0.5}
        roughness={0.6}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}
