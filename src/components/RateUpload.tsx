"use client";

import { useState, useTransition } from "react";
import readXlsxFile from "read-excel-file";
import { applyRateUpload, previewRateUpload, type RateRow, type UploadPlan } from "@/app/actions/upload";
import { money } from "@/lib/format";
import { translator, type Lang } from "@/lib/i18n";
import { parseCsv, sheetToRows } from "@/lib/sheet";

const FIELD: Record<string, string> = { price: "₹", name: "Name", name_hi: "हिंदी", unit: "Unit", cost_price: "Cost", category: "Category" };

export function RateUpload({ lang }: { lang: Lang }) {
  const t = translator(lang);
  const [rows, setRows] = useState<RateRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [createNew, setCreateNew] = useState(true);
  const [plan, setPlan] = useState<UploadPlan | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, start] = useTransition();

  async function onFile(file: File) {
    setError("");
    setDone("");
    setPlan(null);
    setFileName(file.name);
    try {
      const sheet = /\.xlsx$/i.test(file.name) ? await readXlsxFile(file) : parseCsv(await file.text());
      const parsed = sheetToRows(sheet as unknown[][]);
      setRows(parsed);
      start(async () => setPlan(await previewRateUpload(parsed, createNew)));
    } catch (e) {
      setRows(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function refresh(cn: boolean) {
    setCreateNew(cn);
    if (rows) start(async () => setPlan(await previewRateUpload(rows, cn)));
  }

  function apply() {
    if (!rows) return;
    start(async () => {
      const r = await applyRateUpload(rows, createNew);
      setDone(`✓ ${t("updated")}: ${r.updated} · ${t("created")}: ${r.created}${r.errors ? ` · ${t("skipped")}: ${r.errors}` : ""}`);
      setPlan(null);
      setRows(null);
    });
  }

  const fmt = (f: string, v: string | number | null) => (v === null ? "—" : f === "price" || f === "cost_price" ? money(v) : String(v));

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <p className="text-sm">{t("uploadHelp")}</p>
        <a href="/api/products/export" download className="btn-secondary w-full">
          ⬇️ {t("downloadRates")}
        </a>
        <label className="btn-primary w-full cursor-pointer">
          ⬆️ {t("chooseFile")} (.xlsx / .csv)
          <input type="file" accept=".xlsx,.csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {fileName && <p className="muted">📄 {fileName}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={createNew} onChange={(e) => refresh(e.target.checked)} className="h-5 w-5" /> {t("createNew")}
        </label>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {done && <p className="rounded-lg bg-green-50 p-3 font-semibold text-green-700">{done}</p>}
        {pending && <p className="muted">…</p>}
      </section>

      {plan && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="card p-3">
              <div className="text-2xl font-bold text-blue-600">{plan.updates.length}</div>
              <div className="muted">{t("updated")}</div>
            </div>
            <div className="card p-3">
              <div className="text-2xl font-bold text-green-600">{plan.creates.length}</div>
              <div className="muted">{t("created")}</div>
            </div>
            <div className="card p-3">
              <div className={`text-2xl font-bold ${plan.errors.length ? "text-red-600" : "text-stone-400"}`}>{plan.errors.length}</div>
              <div className="muted">{t("skipped")}</div>
            </div>
          </div>

          {plan.errors.length > 0 && (
            <section className="card border-l-4 border-red-500 text-sm">
              <h2 className="h2 mb-2 text-red-700">⚠ {t("skipped")}</h2>
              {plan.errors.map((e, i) => (
                <div key={i} className="py-0.5">
                  Row {e.row}: {e.message}
                </div>
              ))}
            </section>
          )}

          {plan.updates.length > 0 && (
            <section className="card text-sm">
              <h2 className="h2 mb-2">{t("updated")}</h2>
              {plan.updates.map((u) => (
                <div key={u.id} className="list-row">
                  <span className="font-semibold">{u.name}</span>
                  <span className="text-right">
                    {u.changes.map((c) => (
                      <div key={c.field}>
                        <span className="muted">{FIELD[c.field]}: </span>
                        <span className="text-stone-400 line-through">{fmt(c.field, c.from)}</span> → <b>{fmt(c.field, c.to)}</b>
                      </div>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          )}

          {plan.creates.length > 0 && (
            <section className="card text-sm">
              <h2 className="h2 mb-2">{t("created")}</h2>
              {plan.creates.map((c) => (
                <div key={c.name} className="list-row">
                  <span>
                    <b>{c.name_hi}</b> <span className="muted">{c.name}</span>
                  </span>
                  <span>
                    {money(c.price)}/{c.unit}
                  </span>
                </div>
              ))}
            </section>
          )}

          <div className="sticky bottom-20">
            <button className="btn-green w-full py-3 text-lg shadow-lg" disabled={pending || (!plan.updates.length && !plan.creates.length)} onClick={apply}>
              ✓ {t("applyUpload")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
