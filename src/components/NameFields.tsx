"use client";

import { useState } from "react";
import { toHindi } from "@/lib/hindi";

/** English name + Hindi name; the Hindi name follows the English one until the user edits it. */
export function NameFields({ name = "", nameHi = "", labels }: { name?: string; nameHi?: string; labels: { name: string; nameHi: string; auto: string } }) {
  const [en, setEn] = useState(name);
  const [hi, setHi] = useState(nameHi);
  // An existing product whose Hindi name differs from the suggestion was set by hand: keep it.
  const [auto, setAuto] = useState(!nameHi || nameHi === toHindi(name));
  return (
    <>
      <div className="col-span-2">
        <label className="label">{labels.name} (English) *</label>
        <input
          name="name"
          className="input"
          value={en}
          required
          onChange={(e) => {
            setEn(e.target.value);
            if (auto) setHi(toHindi(e.target.value));
          }}
        />
      </div>
      <div className="col-span-2">
        <label className="label flex justify-between">
          <span>{labels.nameHi}</span>
          {auto && en && <span className="text-xs text-green-700">✨ {labels.auto}</span>}
        </label>
        <div className="flex gap-2">
          <input
            name="name_hi"
            className="input"
            value={hi}
            onChange={(e) => {
              setHi(e.target.value);
              setAuto(false);
            }}
          />
          {!auto && (
            <button
              type="button"
              className="btn-secondary btn-sm whitespace-nowrap"
              onClick={() => {
                setHi(toHindi(en));
                setAuto(true);
              }}
            >
              ↺ अनुवाद
            </button>
          )}
        </div>
      </div>
    </>
  );
}
