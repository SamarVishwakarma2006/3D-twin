"use client";
import { useRef, useState } from "react";
import { useWorkspace } from "../lib/store";
import { validateProduct } from "../lib/product";
import { smartphone } from "../data/smartphone";

export function DatasetLoader() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const s = useWorkspace();
  async function load(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Product JSON must be at most 2 MB.");
      const result = validateProduct(JSON.parse(await file.text()));
      if (!result.product) throw new Error(result.errors.join("; "));
      s.loadProduct(result.product);
      setMessage(
        result.warnings.join(" ") || "Product dataset validated and loaded.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load product.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(s.product, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.product.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <details className="dataset-tools">
      <summary>Product dataset</summary>
      <p className="caption">
        Load a structured product definition with procedural geometry or a
        GLTF/GLB URL. Its provenance is shown as supplied, not independently
        certified.
      </p>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Import product JSON"
        onChange={(e) => {
          void load(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="button-row">
        <button onClick={() => input.current?.click()}>Import JSON</button>
        <button onClick={download}>Export JSON</button>
        <button
          onClick={() => {
            s.loadProduct(smartphone);
            setMessage("Demo restored.");
          }}
        >
          Restore demo
        </button>
      </div>
      {message && (
        <p role="status" className="caption">
          {message}
        </p>
      )}
    </details>
  );
}
