"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createBill, type BillInput } from "@/app/actions/bills";
import { money, qty as fmtQty } from "@/lib/format";
import { pname, translator, unitLabel, type Lang } from "@/lib/i18n";

type Product = { id: number; name: string; name_hi: string | null; unit: string; price: number; stock: number };
type Customer = { id: number; name: string; phone: string | null; address: string | null; area: string | null; due: number };
type Line = { productId: number; qty: number; price: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

function matches(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

export function BillForm({
  products,
  customers,
  isOwner,
  lang,
  initialCustomerId,
  wa,
}: {
  products: Product[];
  customers: Customer[];
  isOwner: boolean;
  lang: Lang;
  initialCustomerId?: number | null;
  wa?: { id: number; body: string; from_name: string | null; from_phone: string | null } | null;
}) {
  const t = translator(lang);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Customer
  const [customerId, setCustomerId] = useState<number | null>(initialCustomerId ?? null);
  const [custQ, setCustQ] = useState("");
  const [showNew, setShowNew] = useState(!!wa && !initialCustomerId);
  const [nc, setNc] = useState({ name: wa?.from_name ?? "", phone: wa?.from_phone ?? "", address: "" });
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const custResults = useMemo(() => {
    const q = custQ.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => matches(`${c.name} ${c.phone ?? ""} ${c.area ?? ""}`, q)).slice(0, 6);
  }, [custQ, customers]);

  // Items
  const [lines, setLines] = useState<Line[]>([]);
  const [prodQ, setProdQ] = useState("");
  const prodResults = useMemo(() => {
    const q = prodQ.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => matches(`${p.name} ${p.name_hi ?? ""}`, q)).slice(0, 8);
  }, [prodQ, products]);

  function addProduct(p: Product) {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.productId === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { productId: p.id, qty: 1, price: p.price }];
    });
    setProdQ("");
  }
  const updateLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  // Totals & payment
  const [discount, setDiscount] = useState(0);
  const [mode, setMode] = useState<BillInput["paymentMode"]>("cash");
  const [paid, setPaid] = useState(0);
  const [delivery, setDelivery] = useState<BillInput["delivery"]>(wa ? "home" : "pickup");
  const [notes, setNotes] = useState("");
  const subtotal = round2(lines.reduce((s, l) => s + round2((l.qty || 0) * l.price), 0));
  const total = round2(subtotal - (isOwner ? discount : 0));
  const hasCustomer = !!customerId || (showNew && nc.name.trim() !== "");

  function save() {
    setError("");
    if (!lines.length) return setError(t("noItems"));
    if ((mode === "credit" || mode === "partial") && !hasCustomer) return setError(t("creditNeedsCustomer"));
    start(async () => {
      const res = await createBill({
        customerId,
        newCustomer: !customerId && showNew ? nc : null,
        items: lines,
        discount,
        paymentMode: mode,
        paid,
        delivery,
        notes,
        waMessageId: wa?.id ?? null,
      });
      if ("error" in res) setError(res.error);
      else router.push(`/bills/${res.id}?created=1`);
    });
  }

  return (
    <div className="space-y-4 pb-28">
      {wa && (
        <div className="card border-l-4 border-green-500 bg-green-50">
          <div className="text-sm font-semibold text-green-800">
            💬 {t("fromWhatsApp")} · {wa.from_name} {wa.from_phone}
          </div>
          <p className="mt-1 whitespace-pre-wrap">{wa.body}</p>
        </div>
      )}

      {/* Customer */}
      <section className="card space-y-3">
        <h2 className="h2">{t("customer")}</h2>
        {customer ? (
          <div className="flex items-start justify-between rounded-lg bg-brand-50 p-3">
            <div>
              <div className="font-semibold">{customer.name}</div>
              <div className="muted">{[customer.phone, customer.area].filter(Boolean).join(" · ")}</div>
              {customer.due > 0 && (
                <div className="text-sm font-semibold text-red-600">
                  {t("balance")}: {money(customer.due)}
                </div>
              )}
            </div>
            <button className="text-xl text-stone-500" onClick={() => setCustomerId(null)} aria-label="remove">
              ✕
            </button>
          </div>
        ) : showNew ? (
          <div className="space-y-2">
            <input className="input" placeholder={t("name")} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
            <input className="input" placeholder={t("phone")} type="tel" inputMode="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
            <input className="input" placeholder={t("address")} value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} />
            <button className="text-sm text-brand-700 underline" onClick={() => setShowNew(false)}>
              {t("cancel")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input className="input" placeholder={`${t("searchCustomers")} (${t("walkIn")})`} value={custQ} onChange={(e) => setCustQ(e.target.value)} />
            {custResults.map((c) => (
              <button
                key={c.id}
                className="flex w-full justify-between rounded-lg border border-stone-200 p-2 text-left"
                onClick={() => {
                  setCustomerId(c.id);
                  setCustQ("");
                }}
              >
                <span>
                  <b>{c.name}</b> <span className="muted">{c.phone}</span>
                </span>
                {c.due > 0 && <span className="text-sm text-red-600">{money(c.due)}</span>}
              </button>
            ))}
            <button className="btn-secondary btn-sm" onClick={() => setShowNew(true)}>
              + {t("newCustomer")}
            </button>
          </div>
        )}
      </section>

      {/* Items */}
      <section className="card space-y-3">
        <h2 className="h2">{t("addItems")}</h2>
        <input className="input" placeholder={`🔍 ${t("searchProducts")}`} value={prodQ} onChange={(e) => setProdQ(e.target.value)} />
        {prodResults.length > 0 && (
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200">
            {prodResults.map((p) => (
              <button key={p.id} className="flex w-full items-center justify-between p-2.5 text-left active:bg-brand-50" onClick={() => addProduct(p)}>
                <span>
                  <b>{pname(p, lang)}</b>
                  <span className="muted"> · {lang === "hi" ? p.name : p.name_hi}</span>
                </span>
                <span className="text-right text-sm">
                  {money(p.price)}/{unitLabel(p.unit, lang)}
                  <br />
                  <span className={p.stock <= 0 ? "text-red-600" : "text-stone-400"}>
                    {t("stockLeft")}: {fmtQty(p.stock)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {lines.length === 0 && <p className="muted">{t("noItems")}</p>}
        {lines.map((l, i) => {
          const p = productById.get(l.productId)!;
          return (
            <div key={l.productId} className="rounded-lg border border-stone-200 p-2.5">
              <div className="flex items-start justify-between">
                <div className="font-semibold">{pname(p, lang)}</div>
                <button className="px-2 text-stone-400" onClick={() => removeLine(i)} aria-label="remove">
                  ✕
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button className="btn-secondary btn-sm w-9" onClick={() => updateLine(i, { qty: Math.max(0, round2(l.qty - 1)) })}>
                  −
                </button>
                <input
                  className="input w-20 px-1 text-center"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  value={l.qty}
                  onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                />
                <button className="btn-secondary btn-sm w-9" onClick={() => updateLine(i, { qty: round2(l.qty + 1) })}>
                  +
                </button>
                <span className="text-sm text-stone-500">{unitLabel(p.unit, lang)} ×</span>
                {isOwner ? (
                  <input
                    className="input w-20 px-1 text-right"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={l.price}
                    onChange={(e) => updateLine(i, { price: Number(e.target.value) })}
                  />
                ) : (
                  <span className="text-sm" title={t("priceLocked")}>
                    {money(l.price)} 🔒
                  </span>
                )}
                <span className="ml-auto font-bold">{money(round2((l.qty || 0) * l.price))}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Payment */}
      <section className="card space-y-3">
        <div className="flex justify-between">
          <span>{t("subtotal")}</span>
          <span>{money(subtotal)}</span>
        </div>
        {isOwner && (
          <div className="flex items-center justify-between gap-2">
            <span>{t("discount")}</span>
            <input className="input w-28 text-right" type="number" inputMode="decimal" min="0" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" />
          </div>
        )}
        <div className="flex justify-between text-xl font-bold">
          <span>{t("total")}</span>
          <span>{money(total)}</span>
        </div>

        <div>
          <div className="label">{t("payment")}</div>
          <div className="grid grid-cols-4 gap-2">
            {(["cash", "upi", "credit", "partial"] as const).map((m) => (
              <button key={m} className={`btn btn-sm ${mode === m ? "bg-brand-600 text-white" : "bg-stone-100"}`} onClick={() => setMode(m)}>
                {t(m)}
              </button>
            ))}
          </div>
          {mode === "partial" && (
            <input className="input mt-2" type="number" inputMode="decimal" min="0" placeholder={t("paidNow")} value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} />
          )}
          {(mode === "credit" || mode === "partial") && (
            <p className="mt-1 text-sm text-red-600">
              {t("due")}: {money(mode === "credit" ? total : Math.max(0, total - paid))}
            </p>
          )}
        </div>

        <div>
          <div className="label">{t("delivery")}</div>
          <div className="grid grid-cols-2 gap-2">
            {(["pickup", "home"] as const).map((d) => (
              <button key={d} className={`btn btn-sm ${delivery === d ? "bg-brand-600 text-white" : "bg-stone-100"}`} onClick={() => setDelivery(d)}>
                {d === "home" ? "🛵 " + t("home_delivery") : "🏪 " + t("pickup")}
              </button>
            ))}
          </div>
        </div>
        <input className="input" placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </section>

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-2xl px-4">
        {error && <p className="mb-2 rounded-lg bg-red-600 p-2 text-center text-sm text-white">{error}</p>}
        <button className="btn-primary w-full py-3.5 text-lg shadow-lg" disabled={pending} onClick={save}>
          {pending ? t("saving") : `${t("saveBill")} · ${money(total)}`}
        </button>
      </div>
    </div>
  );
}
