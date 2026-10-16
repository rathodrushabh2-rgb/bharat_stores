"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createBill, getLastRates, type BillInput, type LastRates } from "@/app/actions/bills";
import { money, qty as fmtQty } from "@/lib/format";
import { pname, qtyUnit, SMALL_UNIT, translator, unitLabel, type Lang } from "@/lib/i18n";
import { lineAmount, qtyForAmount, smallQtyExtra, type SmallQtyRule } from "@/lib/pricing";

type Product = { id: number; name: string; name_hi: string | null; unit: string; price: number; stock: number };
type Customer = { id: number; name: string; phone: string | null; address: string | null; area: string | null; due: number };
/**
 * qty is always in the product's own unit (kg, litre, pcs…); `small` only changes how it is typed (g, ml).
 * price is the base rate (the small-quantity extra is added on top).
 * byAmount: quantity is entered as money (typed) and the weight is worked out.
 * override: amount typed by hand for this line; the weight stays as it is.
 */
type Line = { productId: number; qty: number; price: number; small: boolean; byAmount: boolean; typed: number | null; override: number | null };

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function matches(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

export function BillForm({
  products,
  customers,
  isOwner,
  canEditRate,
  rule,
  lang,
  initialCustomerId,
  wa,
}: {
  products: Product[];
  customers: Customer[];
  isOwner: boolean;
  canEditRate: boolean;
  rule: SmallQtyRule;
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

  // This customer's previous rates
  const [lastRates, setLastRates] = useState<LastRates>({});
  const [oldOn, setOldOn] = useState(false);
  useEffect(() => {
    setLastRates({});
    if (!customerId) return;
    let live = true;
    getLastRates(customerId).then((r) => live && setLastRates(r));
    return () => {
      live = false;
    };
  }, [customerId]);
  const hasLastRates = Object.keys(lastRates).length > 0;

  const rateFor = (p: Product, useOld: boolean) => (useOld && lastRates[p.id] ? lastRates[p.id].price : p.price);

  /** New base rate for a line; a "weigh by ₹" line keeps its money and re-works the weight. */
  const withPrice = (l: Line, price: number): Line => {
    const p = productById.get(l.productId)!;
    const qty = l.byAmount && l.typed ? qtyForAmount(l.typed, price, p.unit, rule) : l.qty;
    return { ...l, price, qty, override: null };
  };

  function setOldRates(on: boolean) {
    setOldOn(on);
    setLines((ls) => ls.map((l) => withPrice(l, rateFor(productById.get(l.productId)!, on))));
  }

  function changeCustomer(id: number | null) {
    if (oldOn) {
      setOldOn(false);
      setLines((ls) => ls.map((l) => withPrice(l, productById.get(l.productId)!.price)));
    }
    setCustomerId(id);
  }

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
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: round3(l.qty + (l.small ? 0.1 : 1)), byAmount: false, typed: null, override: null } : l));
      return [...ls, { productId: p.id, qty: 1, price: rateFor(p, oldOn), small: false, byAmount: false, typed: null, override: null }];
    });
    setProdQ("");
  }
  const updateLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  /** Typed quantity: leaves "weigh by ₹" and drops any manual amount. */
  const setQty = (i: number, qty: number) => updateLine(i, { qty, typed: null, override: null });
  const setPrice = (i: number, price: number) => setLines((ls) => ls.map((l, j) => (j === i ? withPrice(l, price) : l)));
  const setTyped = (i: number, money: number) =>
    setLines((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l;
        const p = productById.get(l.productId)!;
        return { ...l, typed: money || null, qty: qtyForAmount(money, l.price, p.unit, rule), override: null };
      }),
    );

  /** Effective rate (with small-quantity extra) and amount of a line. */
  const calc = (l: Line) => {
    const p = productById.get(l.productId)!;
    const extra = smallQtyExtra(p.unit, l.qty || 0, rule);
    const rate = round2(l.price + extra);
    const auto = lineAmount(l.qty || 0, rate, l.byAmount ? l.typed : null);
    return { extra, rate, auto, amount: l.override ?? auto };
  };
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  // Totals & payment
  const [discount, setDiscount] = useState(0);
  const [mode, setMode] = useState<BillInput["paymentMode"]>("cash");
  const [paid, setPaid] = useState(0);
  const [delivery, setDelivery] = useState<BillInput["delivery"]>(wa ? "home" : "pickup");
  const [notes, setNotes] = useState("");
  const subtotal = round2(lines.reduce((s, l) => s + calc(l).amount, 0));
  const total = round2(subtotal - (canEditRate ? discount : 0));
  const hasCustomer = !!customerId || (showNew && nc.name.trim() !== "");

  function save() {
    setError("");
    if (!lines.length) return setError(t("noItems"));
    if ((mode === "credit" || mode === "partial") && !hasCustomer) return setError(t("creditNeedsCustomer"));
    start(async () => {
      const res = await createBill({
        customerId,
        newCustomer: !customerId && showNew ? nc : null,
        items: lines.map((l) => ({
          productId: l.productId,
          qty: round3(l.qty),
          price: l.price,
          amount: l.override ?? (l.byAmount ? l.typed : null),
          amountOverride: l.override !== null,
        })),
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
            <button className="text-xl text-stone-500" onClick={() => changeCustomer(null)} aria-label="remove">
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
                  changeCustomer(c.id);
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
        {customer && hasLastRates && (
          <button
            className={`btn btn-sm w-full ${oldOn ? "bg-purple-100 text-purple-800 ring-1 ring-purple-300" : "bg-purple-600 text-white"}`}
            onClick={() => setOldRates(!oldOn)}
          >
            {oldOn ? `✓ ${t("oldRatesOn")} · ${t("masterRates")}` : `↺ ${t("oldRates")}`}
          </button>
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
                  {money(rateFor(p, oldOn))}/{unitLabel(p.unit, lang)}
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
          const smallUnit = SMALL_UNIT[p.unit];
          const factor = l.small ? 1000 : 1;
          const shown = round3(l.qty * factor);
          const step = l.small ? 50 : 1;
          const last = lastRates[p.id];
          const changed = l.price !== p.price;
          const { extra, rate, auto, amount } = calc(l);
          const overridden = l.override !== null;
          return (
            <div key={l.productId} className={`rounded-lg border p-2.5 ${changed || overridden ? "border-purple-300 bg-purple-50/40" : "border-stone-200"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{pname(p, lang)}</div>
                  <div className="text-xs text-stone-500">{lang === "hi" ? p.name : p.name_hi}</div>
                </div>
                <button className="px-2 text-stone-400" onClick={() => removeLine(i)} aria-label="remove">
                  ✕
                </button>
              </div>

              {/* Quantity: typed as weight, or as money for loose goods */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {l.byAmount ? (
                  <>
                    <span className="text-lg font-semibold">₹</span>
                    <input
                      className="input w-24 px-2 text-center"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder={t("amount")}
                      value={l.typed ?? ""}
                      onChange={(e) => setTyped(i, Number(e.target.value))}
                      aria-label="amount in rupees"
                    />
                    <span className="text-sm font-semibold text-green-700">= {qtyUnit(l.qty, p.unit, lang)}</span>
                  </>
                ) : (
                  <>
                    <button className="btn-secondary btn-sm w-9" onClick={() => setQty(i, Math.max(0, round3((shown - step) / factor)))}>
                      −
                    </button>
                    <input
                      className="input w-20 px-1 text-center"
                      type="number"
                      inputMode="decimal"
                      step={l.small ? 1 : 0.001}
                      min="0"
                      value={Number.isFinite(shown) ? shown : ""}
                      onChange={(e) => setQty(i, round3(Number(e.target.value) / factor))}
                      aria-label="quantity"
                    />
                    <button className="btn-secondary btn-sm w-9" onClick={() => setQty(i, round3((shown + step) / factor))}>
                      +
                    </button>
                  </>
                )}
                {smallUnit ? (
                  // kg / grams / ₹ : how the quantity is typed. The quantity itself stays the same.
                  <div className="flex overflow-hidden rounded-lg ring-1 ring-stone-300">
                    {(["big", "small", "money"] as const).map((m) => {
                      const active = m === "money" ? l.byAmount : !l.byAmount && l.small === (m === "small");
                      return (
                        <button
                          key={m}
                          className={`px-2 py-1.5 text-sm ${active ? "bg-stone-800 text-white" : "bg-white"}`}
                          onClick={() =>
                            m === "money"
                              ? updateLine(i, { byAmount: true, typed: l.typed ?? (amount || null) })
                              : updateLine(i, { byAmount: false, typed: null, small: m === "small" })
                          }
                        >
                          {m === "money" ? "₹" : unitLabel(m === "small" ? smallUnit : p.unit, lang)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-stone-500">{unitLabel(p.unit, lang)}</span>
                )}
              </div>

              {/* Rate and amount */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-stone-500">
                  {t("rate")} /{unitLabel(p.unit, lang)}
                </span>
                {canEditRate ? (
                  <input
                    className={`input w-20 px-2 py-1.5 text-right ${changed ? "border-purple-400 font-semibold text-purple-800" : ""}`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={l.price}
                    onChange={(e) => setPrice(i, Number(e.target.value))}
                    aria-label="rate"
                  />
                ) : (
                  <span title={t("priceLocked")}>{money(l.price)} 🔒</span>
                )}
                <span className="ml-auto text-stone-500">₹</span>
                {canEditRate ? (
                  <input
                    className={`input w-24 px-2 py-1.5 text-right text-base font-bold ${overridden ? "border-purple-400 text-purple-800" : ""}`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => updateLine(i, { override: e.target.value === "" ? 0 : Number(e.target.value) })}
                    aria-label="line amount"
                  />
                ) : (
                  <span className="text-base font-bold">{money(amount)}</span>
                )}
              </div>
              {(changed || overridden || extra > 0 || (last && last.price !== l.price)) && (
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  {extra > 0 && (
                    <span className="text-amber-700">
                      +{money(extra)}/{unitLabel(p.unit, lang)} {t("smallQtyExtra")} = {money(rate)}
                    </span>
                  )}
                  {overridden && (
                    <button className="text-purple-700 underline" onClick={() => updateLine(i, { override: null })}>
                      {t("amountChanged")} · {money(auto)}
                    </button>
                  )}
                  {changed && (
                    <button className="text-purple-700 underline" onClick={() => setPrice(i, p.price)}>
                      {t("listRate")}: {money(p.price)}
                    </button>
                  )}
                  {last && last.price !== l.price && (
                    <button className="text-purple-700 underline" onClick={() => setPrice(i, last.price)}>
                      {t("lastRate")}: {money(last.price)} ({t("billLabel")} #{last.bill_no})
                    </button>
                  )}
                </div>
              )}
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
        {canEditRate && (
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
