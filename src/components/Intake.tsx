"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import InsideDeviceHero from "./ui/inside-device-hero";

import Image from "next/image";
import { ArrowUpRight, Upload } from "lucide-react";
import {
  localIdentification,
  type IdentificationInput,
  type Candidate,
} from "../lib/providers";
import { validateImage } from "../lib/upload";
import { smartphone } from "../data/smartphone";
import { useWorkspace, type Mode } from "../lib/store";

export function Intake({ onOpen }: { onOpen: () => void }) {
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [images, setImages] = useState<
    (IdentificationInput["images"][number] & { url: string })[]
  >([]);
  const urls = useRef<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [stages, setStages] = useState<string[]>([]);

  const [activeSystem, setActiveSystem] = useState("all");
  const systems = [
    ["all", "All parts"],
    ["exterior", "Exterior"],
    ["power", "Power system"],
    ["compute", "Compute"],
    ["camera", "Camera"],
    ["audio", "Audio"],
  ];
  const featuredParts = smartphone.components
    .filter((part) => activeSystem === "all" || part.systemId === activeSystem)
    .slice(0, 6);
  useEffect(
    () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    setCandidate(null);
    try {
      if (files.length + images.length > 6)
        throw new Error("Upload at most six images.");
      const metadata = await Promise.all(
        Array.from(files).map(async (file) => ({
          file,
          metadata: await validateImage(file),
        })),
      );
      const next = metadata.map(({ file, metadata }) => {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        return { ...metadata, url };
      });
      setImages((current) => [...current, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image validation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function identify() {
    setBusy(true);
    setError("");
    setCandidate(null);
    try {
      const result = await localIdentification.identifyProduct({
        name,
        manufacturer,
        model,
        images: images.map(({ url, ...rest }) => {
          void url;
          return rest;
        }),
      });
      setStages(result.stages);
      setCandidate(result.candidates[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Identification failed.");
    } finally {
      setBusy(false);
    }
  }
  function openDemo(mode: Mode = "Explore", componentId?: string) {
    const state = useWorkspace.getState();
    if (state.product !== smartphone) state.loadProduct(smartphone);
    useWorkspace.getState().restore();
    useWorkspace.getState().setMode(mode);
    if (componentId) useWorkspace.getState().focus(componentId);
    else useWorkspace.getState().resetCamera();
    onOpen();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startProduct() {
    document.getElementById("explore")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  return (
    <main className="landing inside-landing">
      <InsideDeviceHero
        onOpenDemo={() => openDemo()}
        onStartProduct={startProduct}
        onOpenDependencies={() => openDemo("Dependencies")}
        onOpenSimulation={() => openDemo("Simulation", "battery")}
      />
      <div className="landing-grid inside-product-entry">
        <section className="intake" id="explore">
          <div className="eyebrow">01 / START AN EXPLORATION</div>
          <h2>Bring a product into view.</h2>
          <p className="muted">
            Start with an image or product name. We’ll show the available model
            and its confidence before opening it.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void identify();
            }}
          >
            <label className="upload">
              <Upload size={25} />
              <strong>{busy ? "Validating…" : "Choose product images"}</strong>
              <span>JPEG, PNG, WebP · up to 8 MB each · 6 views</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = "";
                }}
                aria-label="Product images"
              />
            </label>
            {images.length > 0 && (
              <div className="image-previews">
                {images.map((img, i) => (
                  <div key={img.url}>
                    <Image
                      unoptimized
                      width={90}
                      height={70}
                      src={img.url}
                      alt={`Product view ${i + 1}`}
                    />
                    <select
                      aria-label={`Image ${i + 1} view`}
                      value={img.view}
                      onChange={(e) =>
                        setImages((all) =>
                          all.map((v, n) =>
                            n === i
                              ? { ...v, view: e.target.value as typeof v.view }
                              : v,
                          ),
                        )
                      }
                    >
                      {[
                        "front",
                        "back",
                        "left",
                        "right",
                        "top",
                        "bottom",
                        "detail",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => {
                        URL.revokeObjectURL(img.url);
                        setImages((all) => all.filter((_, n) => n !== i));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="field">
              Product name
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setCandidate(null);
                }}
                placeholder="e.g. Smartphone"
                maxLength={150}
              />
            </label>
            <div className="form-pair">
              <label className="field">
                Manufacturer <span>optional</span>
                <input
                  value={manufacturer}
                  onChange={(e) => {
                    setManufacturer(e.target.value);
                    setCandidate(null);
                  }}
                  placeholder="Manufacturer"
                  maxLength={100}
                />
              </label>
              <label className="field">
                Model <span>optional</span>
                <input
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setCandidate(null);
                  }}
                  placeholder="Model number"
                  maxLength={100}
                />
              </label>
            </div>
            <button
              className="primary wide"
              type="submit"
              disabled={busy || (!name.trim() && !images.length)}
            >
              Analyze Product <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="caption">
            Images stay in this browser. The local fallback matches text
            metadata; it does not perform image recognition.
          </p>
          {error && (
            <p role="alert" className="warning">
              {error}
            </p>
          )}
          {candidate && (
            <div className="candidate" role="status">
              <span className="badge">
                {Math.round(candidate.confidence * 100)}% CATEGORY CONFIDENCE
              </span>
              <h3>{candidate.name}</h3>
              <p>{candidate.reason}</p>
              <ul>
                {stages.map((stage) => (
                  <li key={stage}>{stage}</li>
                ))}
              </ul>
              <button className="primary wide" onClick={() => openDemo()}>
                Use educational demo model →
              </button>
            </div>
          )}
          <div className="intake-note">
            <span>✳</span> No setup. No API key. Just curiosity.
          </div>
        </section>
      </div>
      <section className="how-section" id="how-it-works">
        <div className="how-heading">
          <span className="eyebrow">A CLOSER LOOK AT THE EVERYDAY</span>
          <p>
            From outer shell to inner system.
            <br />
            <em>All in one place.</em>
          </p>
        </div>
        <div className="how-cards">
          <article>
            <span className="card-index">01 — DISCOVER</span>
            <div className="mini-orbit">
              <span>01</span>
              <span>02</span>
              <span>03</span>
              <i />
            </div>
            <h3>See what’s inside</h3>
            <p>
              Move from a product’s outer shell to its individual parts in a
              living 3D view.
            </p>
          </article>
          <article>
            <span className="card-index">02 — UNDERSTAND</span>
            <div className="mini-dependency">
              <i />
              <i />
              <i />
              <i />
              <b>↗</b>
            </div>
            <h3>Follow every connection</h3>
            <p>
              See how parts rely on each other, and what changes when one part
              fails.
            </p>
          </article>
          <article>
            <span className="card-index">03 — MAKE IT YOURS</span>
            <div className="mini-slider">
              <span>XRAY</span>
              <i />
              <span>68%</span>
            </div>
            <h3>Explore at your pace</h3>
            <p>
              Inspect components, run a simulation, and learn how the system
              responds.
            </p>
          </article>
        </div>
        <div className="component-shelf">
          <div className="component-shelf-heading">
            <div>
              <span className="eyebrow">THE SMARTPHONE, UNDER THE SURFACE</span>
              <h2>Explore the component library.</h2>
            </div>
            <p>Choose a system. Open any part in the interactive lab.</p>
          </div>
          <div
            className="component-filters"
            role="group"
            aria-label="Filter components by system"
          >
            {systems.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeSystem === id}
                onClick={() => setActiveSystem(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="component-grid">
            {featuredParts.map((part, index) => (
              <button
                className="component-card"
                key={part.id}
                type="button"
                onClick={() => {
                  openDemo("Explore", part.id);
                }}
                aria-label={`Explore ${part.name} in the interactive lab`}
              >
                <span className={`component-card-art art-${index % 4}`}>
                  <span
                    style={
                      {
                        backgroundColor: part.geometry.color,
                        "--part-color": part.geometry.color,
                      } as CSSProperties
                    }
                  />
                  <small>{part.systemId.toUpperCase()}</small>
                </span>
                <span className="component-card-copy">
                  <strong>{part.name}</strong>
                  <small>{part.function}</small>
                </span>
                <ArrowUpRight className="component-card-arrow" size={15} />
              </button>
            ))}
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <span>
          INSIDE <i> / </i> DIGITAL TWIN STUDIO
        </span>
        <span>
          Educational demo · models are illustrative, not manufacturer-verified.
        </span>
      </footer>
    </main>
  );
}
