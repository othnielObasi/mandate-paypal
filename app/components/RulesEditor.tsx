"use client";

import { useState } from "react";
import type { Policy } from "@/lib/gate/policy";
import { formToPolicy, policyToForm, type PolicyForm } from "@/lib/ui/policy-form";

/** Shows the rules the AI read from the user's sentence, editable before saving. */
export function RulesEditor({ initial, busy, onSave, onCancel }: { initial: Policy; busy: boolean; onSave: (p: Policy) => void; onCancel: () => void }) {
  const [f, setF] = useState<PolicyForm>(() => policyToForm(initial));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PolicyForm>(k: K, v: PolicyForm[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const r = formToPolicy(f, initial.currency);
    if (!r.ok) return setError(r.error);
    setError(null);
    onSave(r.policy);
  };

  return (
    <div className="editor" data-testid="rules-editor">
      <p className="small">Check what the AI understood. Edit anything, then save.</p>
      <div className="form">
        <label>
          Categories
          <input type="text" value={f.categories} onChange={(e) => set("categories", e.target.value)} />
        </label>
        <label>
          Per-item limit ($)
          <input type="text" inputMode="decimal" value={f.maxItem} onChange={(e) => set("maxItem", e.target.value)} />
        </label>
        <label>
          Budget ($)
          <input type="text" inputMode="decimal" value={f.budget} onChange={(e) => set("budget", e.target.value)} />
        </label>
        <label>
          Per
          <select value={f.period} onChange={(e) => set("period", e.target.value as PolicyForm["period"])}>
            <option value="week">week</option>
            <option value="month">month</option>
          </select>
        </label>
        <label>
          Over a limit
          <select value={f.overLimit} onChange={(e) => set("overLimit", e.target.value as PolicyForm["overLimit"])}>
            <option value="ask">ask me</option>
            <option value="block">refuse</option>
          </select>
        </label>
        <label>
          Expires
          <input type="date" value={f.expires} onChange={(e) => set("expires", e.target.value)} />
        </label>
        <label className="wide">
          Blocked sellers
          <input type="text" value={f.blocked} placeholder="none" onChange={(e) => set("blocked", e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={f.verifiedOnly} onChange={(e) => set("verifiedOnly", e.target.checked)} />
          Verified sellers only
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="primary" onClick={save} disabled={busy}>
          Save mandate
        </button>
        <button onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
