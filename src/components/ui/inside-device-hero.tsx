"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUpRight, Box } from "lucide-react";
import { smartphone } from "../../data/smartphone";
import { ErrorBoundary } from "../ErrorBoundary";
import {
  chapters,
  clamp01,
  sceneCoord,
  heroSimulation,
} from "./device-timeline";
import "./inside-device-hero.css";

function DeviceFallback() {
  return (
    <div
      className="inside-hero-fallback"
      role="img"
      aria-label="Illustrative smartphone with glass display and camera"
    >
      <svg viewBox="0 0 240 440" aria-hidden="true">
        <defs>
          <linearGradient id="inside-device-metal" x2="1" y2="1">
            <stop stopColor="#a9c8ff" />
            <stop offset=".35" stopColor="#29374a" />
            <stop offset="1" stopColor="#63758c" />
          </linearGradient>
          <linearGradient id="inside-device-screen" x2="1" y2="1">
            <stop stopColor="#0e1c2c" />
            <stop offset="1" stopColor="#345370" />
          </linearGradient>
        </defs>
        <rect
          x="12"
          y="5"
          width="216"
          height="428"
          rx="28"
          fill="url(#inside-device-metal)"
        />
        <rect
          x="20"
          y="14"
          width="200"
          height="410"
          rx="23"
          fill="url(#inside-device-screen)"
        />
        <rect x="91" y="25" width="58" height="12" rx="6" fill="#080a0f" />
        <rect
          x="53"
          y="147"
          width="134"
          height="134"
          rx="9"
          fill="none"
          stroke="#89d9c1"
        />
        <rect
          x="68"
          y="162"
          width="104"
          height="104"
          rx="7"
          fill="none"
          stroke="#89d9c1"
        />
        <text x="120" y="221" textAnchor="middle" fill="#edf5ff" fontSize="22">
          inside /
        </text>
        <text
          x="120"
          y="319"
          textAnchor="middle"
          fill="#a9c8ff"
          fontSize="9"
          letterSpacing="2"
        >
          DIGITAL TWIN · DT–01
        </text>
        <rect x="91" y="407" width="58" height="3" rx="2" fill="#a9c8ff" />
      </svg>
    </div>
  );
}
const DeviceScene = dynamic(() => import("./device-scene"), {
  ssr: false,
  loading: DeviceFallback,
});
const headlines = [
  ["Understand any product.", "From the inside out."],
  ["See beyond", "the surface."],
  ["Every part", "has a purpose."],
  ["Nothing", "works alone."],
  ["Ask “what if?”", "See what changes."],
  ["Explore. Simulate.", "Understand."],
];
const descriptions = [
  "Explore a smartphone’s digital twin. Inspect its components, follow their connections, and see how failures affect the whole system.",
  "Move from the outer shell to the systems that power everything.",
  "Inspect components and understand what each one contributes.",
  "Trace the connections that turn individual parts into a working system.",
  "Simulate a component failure and trace its effects through the system.",
  "A closer look at the products you use every day.",
];
type Props = {
  onOpenDemo: () => void;
  onStartProduct: () => void;
  onOpenDependencies: () => void;
  onOpenSimulation: () => void;
};
export default function InsideDeviceHero(props: Props) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const coordinate = useRef(0);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState("battery");
  const [reduced, setReduced] = useState(true);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!root.current) return;
    let visible = false;
    const update = () => setRunning(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    const container = root.current;
    const panel = stage.current;
    if (!container || !panel || reduced) return;
    let raf = 0;
    let previous = performance.now();
    const frame = (now: number) => {
      raf = 0;
      if (document.hidden) return;
      const rect = container.getBoundingClientRect();
      const p = clamp01(
        -rect.top / Math.max(1, rect.height - panel.clientHeight),
      );
      const target = sceneCoord(p);
      const delta = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      coordinate.current +=
        (target - coordinate.current) * (1 - Math.exp(-delta * 12));
      const chapter = Math.round(coordinate.current);
      setActive((last) => (last === chapter ? last : chapter));
      panel.style.setProperty("--inside-progress", String(p));
      panel.style.setProperty(
        "--inside-reveal",
        String(Math.max(0, 1 - Math.abs(coordinate.current - chapter) * 2)),
      );
      if (Math.abs(target - coordinate.current) > 0.001)
        raf = requestAnimationFrame(frame);
    };
    const update = () => {
      if (!raf) {
        previous = performance.now() - 16;
        raf = requestAnimationFrame(frame);
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(panel);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [reduced]);
  function jump(index: number) {
    if (reduced) {
      coordinate.current = index;
      setActive(index);
      return;
    }
    if (!root.current || !stage.current) return;
    window.scrollTo({
      top:
        window.scrollY +
        root.current.getBoundingClientRect().top +
        (index / 5) * (root.current.offsetHeight - stage.current.offsetHeight),
      behavior: "smooth",
    });
  }
  const part = smartphone.components.find((p) => p.id === selected)!;
  const action =
    active === 3
      ? props.onOpenDependencies
      : active === 4
        ? props.onOpenSimulation
        : props.onOpenDemo;
  const actionLabel =
    active === 3
      ? "Explore dependencies"
      : active === 4
        ? "Run a simulation"
        : active === 5
          ? "Open the interactive lab"
          : "Explore the demo";
  return (
    <section
      ref={root}
      className={`inside-hero-root${reduced ? " inside-hero-reduced" : ""}`}
      aria-label="Inside smartphone story"
    >
      <div ref={stage} className="inside-hero-stage" data-scene={active}>
        <h1 className="sr-only">
          Inside / Digital Twin Studio — Understand any product. From the inside
          out.
        </h1>
        <header className="inside-hero-header">
          <a className="inside-hero-brand" href="#" aria-label="Inside home">
            <Box size={22} />
            <strong>
              inside<span> /</span>
            </strong>
            <small>Digital Twin Studio</small>
          </a>
          <div>
            <button onClick={props.onStartProduct} className="inside-hero-skip">
              Bring your product
            </button>
            <button onClick={props.onOpenDemo} className="inside-hero-lab">
              Open the lab <ArrowUpRight size={14} />
            </button>
          </div>
        </header>
        <div className="inside-hero-word" aria-hidden="true">
          {"INSIDE".split("").map((letter, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.07}s` }}>
              {letter}
            </span>
          ))}
        </div>
        <div className="inside-hero-model" aria-hidden="true">
          {reduced || failed ? (
            <DeviceFallback />
          ) : (
            <ErrorBoundary fallback={<DeviceFallback />}>
              <DeviceScene
                coordinate={coordinate}
                selected={selected}
                running={running}
                onFailure={fail}
                fallback={<DeviceFallback />}
              />
            </ErrorBoundary>
          )}
        </div>
        <div className="inside-hero-device-label" aria-hidden="true">
          <span>DT–01</span>
          <small>
            {active === 2
              ? "EXPLODED ASSEMBLY"
              : active === 1
                ? "X-RAY / INTERNAL VIEW"
                : active === 3
                  ? "DEPENDENCY NETWORK"
                  : active === 4
                    ? "FAILURE PREVIEW"
                    : "GENERIC SMARTPHONE"}
          </small>
        </div>
        <div className="inside-hero-copy" key={active}>
          <div className="inside-hero-eyebrow">
            <i />
            {String(active + 1).padStart(2, "0")} / {chapters[active]}
          </div>
          <h2>
            {headlines[active][0]}
            <br />
            <em>{headlines[active][1]}</em>
          </h2>
          <p>{descriptions[active]}</p>
          {active === 0 && (
            <div className="inside-hero-facts">
              15 components <span>·</span> Interactive 3D <span>·</span> No API
              key required
            </div>
          )}
          {active === 1 && (
            <div className="inside-hero-tags">
              <span>Display</span>
              <span>Battery</span>
              <span>Main board</span>
            </div>
          )}
          {active === 2 && (
            <div className="inside-hero-inspect">
              <div role="group" aria-label="Inspect a component">
                {["battery", "processor", "camera", "port"].map((id) => (
                  <button
                    key={id}
                    aria-pressed={selected === id}
                    onClick={() => setSelected(id)}
                  >
                    {smartphone.components.find((p) => p.id === id)!.name}
                  </button>
                ))}
              </div>
              <p role="status">
                <strong>{part.name}</strong>
                {part.function}
              </p>
            </div>
          )}
          {active === 3 && (
            <div className="inside-hero-links">
              {smartphone.dependencies
                .filter(
                  (e) =>
                    e.sourceComponentId === "battery" ||
                    e.sourceComponentId === "connector",
                )
                .map((edge) => (
                  <span key={edge.id}>
                    {
                      smartphone.components.find(
                        (p) => p.id === edge.sourceComponentId,
                      )!.name
                    }
                    <b>→</b>
                    {
                      smartphone.components.find(
                        (p) => p.id === edge.targetComponentId,
                      )!.name
                    }
                  </span>
                ))}
            </div>
          )}
          {active === 4 && (
            <div className="inside-hero-simulation">
              <span>ILLUSTRATIVE PREVIEW / BATTERY FAILURE</span>
              <strong>
                {heroSimulation.failedComponents.length} failed <i>·</i>{" "}
                {heroSimulation.unaffectedComponents.length} unaffected
              </strong>
              <small>Calculated from the demo’s dependency graph.</small>
            </div>
          )}
          <div className="inside-hero-actions">
            <button onClick={action}>
              {actionLabel}
              <ArrowUpRight size={17} />
            </button>
            {(active === 0 || active === 5) && (
              <button
                className="inside-hero-secondary"
                onClick={props.onStartProduct}
              >
                {active === 5
                  ? "Start with your product"
                  : "Bring your product"}
              </button>
            )}
          </div>
          {active === 5 && (
            <p className="inside-hero-note">
              Educational demo. Models and repair information are illustrative.
            </p>
          )}
        </div>
        <nav className="inside-hero-nav" aria-label="Story chapters">
          {chapters.map((chapter, index) => (
            <button
              key={chapter}
              aria-label={`${String(index + 1).padStart(2, "0")} ${chapter}`}
              onClick={() => jump(index)}
              aria-current={active === index ? "step" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{chapter}</b>
              <i />
            </button>
          ))}
        </nav>
        <footer className="inside-hero-footer">
          <span>
            {reduced ? "CHOOSE A CHAPTER TO EXPLORE" : "SCROLL TO LOOK INSIDE"}
            <ArrowDown size={13} />
          </span>
          <small>PROCEDURAL MODEL / EDUCATIONAL DEMO</small>
          <span>
            {String(active + 1).padStart(2, "0")} <i>/ 06</i>
          </span>
        </footer>
        <div className="inside-hero-progress" aria-hidden="true" />
      </div>
    </section>
  );
}
