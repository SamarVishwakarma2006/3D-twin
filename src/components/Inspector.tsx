"use client";
import { useState } from "react";
import { useWorkspace } from "../lib/store";
import { DependencyGraph } from "../lib/graph";
import { analyzeCompatibility } from "../lib/compatibility";
import { analyzeWhatIf } from "../lib/simulation";
import type { Component, FailureType } from "../lib/product";

function Sources({ component: c }: { component: Component }) {
  return (
    <div className="source-note">
      <span className="badge">
        {c.provenance.sourceType.toUpperCase()} DATA ·{" "}
        {c.provenance.verified ? "VERIFIED" : "UNVERIFIED"}
      </span>
      <p>
        {c.provenance.sourceTitle}.{" "}
        {c.provenance.verified
          ? "Verification status supplied by the dataset."
          : "Manufacturer-specific information is unavailable."}
        {c.provenance.sourceUrl && (
          <a href={c.provenance.sourceUrl} target="_blank" rel="noreferrer">
            {" "}
            View source ↗
          </a>
        )}
      </p>
    </div>
  );
}
function Replacement({ component: c }: { component: Component }) {
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const result = analyzeCompatibility(c, {
    specifications: specs,
    provenance: { ...c.provenance, sourceType: "userProvided" },
  });
  return (
    <section>
      <h3>Replacement assessment</h3>
      <p className="muted">
        Enter a candidate part’s specifications. This checks supplied values; it
        does not certify a physical part.
      </p>
      {Object.entries(c.replacement.requirements).map(([field, value]) => (
        <label className="field" key={field}>
          {field}
          <input
            value={specs[field] ?? ""}
            placeholder={`Required: ${value}`}
            onChange={(e) => setSpecs({ ...specs, [field]: e.target.value })}
          />
        </label>
      ))}
      <strong className="badge">{result.status.replaceAll("_", " ")}</strong>
      <ul className="checks">
        {result.checks.map((c) => (
          <li key={c.field}>
            {c.field}
            <span>{c.result}</span>
          </li>
        ))}
      </ul>
      <p className="muted">
        Missing verification:{" "}
        {result.missingVerification.join(", ") ||
          "Manufacturer approval still required"}
        .
      </p>
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://www.google.com/search?q=${encodeURIComponent(c.replacement.query + " manufacturer service parts")}`}
      >
        Search service parts ↗
      </a>
      <p className="caption">
        Generic search only. No live inventory or verified supplier data.
      </p>
    </section>
  );
}
export function Inspector() {
  const s = useWorkspace();
  const tab = s.inspectorTab;
  const setTab = (tab: string) =>
    useWorkspace.setState({ inspectorTab: tab as typeof s.inspectorTab });
  const c = s.product.components.find((c) => c.id === s.selectedComponentId);
  if (!c)
    return (
      <div className="empty">
        <span className="eyebrow">COMPONENT INSPECTOR</span>
        <h2>Every part has a purpose.</h2>
        <p>
          Select a component in the navigator, 3D view or dependency graph to
          explore how it works.
        </p>
        <button onClick={() => s.focus(s.product.components[0].id)}>
          Explore a component
        </button>
      </div>
    );
  const graph = new DependencyGraph(s.product);
  return (
    <div className="inspector" key={c.id}>
      <div className="eyebrow">{c.systemId} / COMPONENT</div>
      <h2>{c.name}</h2>
      <p>{c.function}</p>
      <Sources component={c} />
      <div className="button-row">
        <button onClick={() => s.focus(c.id)}>Focus</button>
        <button onClick={() => s.isolate(c.id)}>Isolate</button>
        <button onClick={() => s.toggleHidden(c.id)}>
          {s.hiddenComponentIds.includes(c.id) ? "Show" : "Hide"}
        </button>
      </div>
      <div className="tabs">
        {["Overview", "Relationships", "Replacement"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <h3>Purpose</h3>
          <p>{c.purpose}</p>
          <h3>Specifications</h3>
          <dl>
            {Object.entries(c.technicalSpecifications).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h3>Supported failure states</h3>
          <div className="tags">
            {c.failureModes.map((f) => (
              <span key={f}>{f.replaceAll("_", " ").toLowerCase()}</span>
            ))}
          </div>
          <button className="wide" onClick={() => s.setMode("Repair")}>
            Open repair guidance →
          </button>
        </>
      )}
      {tab === "Relationships" && (
        <>
          {[
            [
              "Depends on",
              graph.getDependencies(c.id).map((e) => e.sourceComponentId),
            ],
            [
              "Supplies / supports",
              graph.getDependents(c.id).map((e) => e.targetComponentId),
            ],
          ].map(([title, ids]) => (
            <section key={title as string}>
              <h3>{title}</h3>
              {(ids as string[]).length ? (
                (ids as string[]).map((id) => (
                  <button
                    className="list-link"
                    key={id}
                    onClick={() => s.select(id)}
                  >
                    {s.product.components.find((c) => c.id === id)?.name} →
                  </button>
                ))
              ) : (
                <p className="muted">No recorded relationships.</p>
              )}
            </section>
          ))}
          <button onClick={() => s.setMode("Dependencies")}>
            Open dependency graph
          </button>
        </>
      )}
      {tab === "Replacement" && <Replacement key={c.id} component={c} />}
    </div>
  );
}
export function SimulationPanel() {
  const s = useWorkspace();
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");
  const c = s.product.components.find((c) => c.id === s.selectedComponentId);
  const sim = s.activeSimulation;
  return (
    <div className="inspector">
      <span className="eyebrow">DETERMINISTIC ENGINE</span>
      <h2>Failure laboratory</h2>
      <p className="muted">
        Single-fault educational scenarios. These rules describe functional
        dependencies, not physical damage or electrical transients.
      </p>
      {c ? (
        <>
          <h3>{c.name}</h3>
          <label className="field">
            Inject a failure
            <select
              aria-label="Failure type"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value)
                  s.simulate(c.id, e.target.value as FailureType);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Choose a supported state…
              </option>
              {c.failureModes.map((f) => (
                <option key={f} value={f}>
                  {f.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button className="primary wide" onClick={() => s.simulate(c.id)}>
            Simulate failure
          </button>
        </>
      ) : (
        <p>Select a component to inject a failure.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const result = analyzeWhatIf(
            s.product,
            question,
            s.selectedComponentId ?? undefined,
          );
          if (result.kind === "simulation") {
            s.applySimulation(result.simulation);
            setMessage("Scenario calculated from the dependency rules.");
          } else setMessage(result.message);
        }}
      >
        <label className="field">
          What-if scenario
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What if I disconnect the battery?"
            maxLength={500}
          />
        </label>
        <button disabled={!question.trim()} type="submit">
          Analyze scenario
        </button>
        <p role="status" className="muted">
          {message}
        </p>
      </form>
      <div className="button-row">
        <button disabled={!sim} onClick={s.resetSimulation}>
          Reset simulation
        </button>
        <button
          disabled={!s.simulationHistory.length}
          onClick={s.undoSimulation}
        >
          Undo
        </button>
      </div>
      {sim && (
        <>
          <div className="section-heading">
            <h3>Scenario result</h3>
            <span className="badge">{sim.severity} impact</span>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={s.compareBefore}
              onChange={(e) =>
                useWorkspace.setState({ compareBefore: e.target.checked })
              }
            />
            Compare: show healthy baseline
          </label>
          <p>
            {sim.failedComponents.length} failed ·{" "}
            {sim.degradedComponents.length} degraded ·{" "}
            {sim.unaffectedComponents.length} unaffected
          </p>
          <h3>Immediate impact</h3>
          <p>
            {sim.directlyAffected
              .map((id) => s.product.components.find((c) => c.id === id)?.name)
              .join(", ") || "No downstream effect recorded."}
          </p>
          <h3>Secondary impact</h3>
          <p>
            {sim.indirectlyAffected
              .map((id) => s.product.components.find((c) => c.id === id)?.name)
              .join(", ") || "None recorded."}
          </p>
          <h3>Affected systems</h3>
          <p>{sim.affectedSystems.join(", ")}</p>
          <h3>Propagation paths</h3>
          {Object.entries(sim.dependencyPaths)
            .filter(([id]) => id !== sim.rootId)
            .map(([id, path]) => (
              <button className="path" key={id} onClick={() => s.select(id)}>
                {path
                  .map(
                    (n) => s.product.components.find((c) => c.id === n)?.name,
                  )
                  .join(" → ")}
              </button>
            ))}
          <h3>Potential recovery</h3>
          <p>
            Restore the injected component and verify its dependents. The model
            does not rule out additional faults.
          </p>
        </>
      )}
      {s.simulationHistory.length > 0 && (
        <>
          <h3>Session history</h3>
          {s.simulationHistory.map((scenario, i) => (
            <button
              className="list-link"
              key={scenario.id}
              onClick={() =>
                useWorkspace.setState({
                  activeSimulation: scenario,
                  compareBefore: false,
                })
              }
            >
              Scenario {i + 1} ·{" "}
              {s.product.components.find((c) => c.id === scenario.rootId)?.name}{" "}
              · {scenario.failureType.toLowerCase().replaceAll("_", " ")}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
export function RepairPanel() {
  const s = useWorkspace();
  const c = s.product.components.find(
    (c) => c.id === (s.repairComponentId ?? s.selectedComponentId),
  );
  if (!c)
    return (
      <div className="empty">
        <h2>Interactive repair context</h2>
        <p>
          Select a component to see its symptoms, dependencies and service
          guidance.
        </p>
      </div>
    );
  return (
    <div className="inspector">
      <span className="eyebrow">REPAIR / {c.repair.difficulty}</span>
      <h2>{c.name}</h2>
      <Sources component={c} />
      <div className="warning">
        <strong>Professional service recommended</strong>
        {c.safetyNotes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
      <h3>Symptoms</h3>
      <ul>
        {c.repair.symptoms.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3>Possible causes</h3>
      <ul>
        {c.repair.causes.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3>Preparation & tools</h3>
      <ul>
        {[...c.repair.preparation, ...c.repair.tools].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3>Guided inspection</h3>
      {c.repair.steps.map((step, i) => (
        <button
          className={`repair-step ${s.activeRepairStep === i ? "active" : ""}`}
          key={i}
          onClick={() => {
            s.focus(step.componentIds[0] ?? c.id);
            useWorkspace.setState({ activeRepairStep: i });
          }}
        >
          <span>{String(i + 1).padStart(2, "0")}</span>
          {step.text}
        </button>
      ))}
      <h3>Post-service verification</h3>
      <ul>
        {c.repair.verification.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="caption">Category: {c.repair.category}</p>
    </div>
  );
}
