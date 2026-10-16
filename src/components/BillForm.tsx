"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createBill, getLastRates, type BillInput, type LastRates } from "@/app/actions/bills";
import { money, qty as fmtQty } from "@/lib/format";
import { pname, qtyUnit, SMALL_UNIT, translator, unitLabel, type Lang } from "@/lib/i18n";
import { Icon } from "./Icon";
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
  frequent,
  customers,
  isOwner,
  canEditRate,
  rule,
  lang,
  initialCustomerId,
  wa,
}: {
  products: Product[];
  /** Product ids sold most often, for the quick-add chips. */
  frequent: number[];
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

  const inCart = new Set(lines.map((l) => l.productId));
  const quick = frequent.map((id) => productById.get(id)).filter((p): p is Product => !!p && !inCart.has(p.id)).slice(0, 8);
  const seg = (on: boolean) => `seg-btn ${on ? "seg-dark" : ""}`;

  return (
    <div className="space-y-4 pb-44">
      {wa && (
        <div className="card border-[1.5px] border-green-600 bg-green-50">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <Icon name="chat" size={18} /> {t("fromWhatsApp")} · {wa.from_name} {wa.from_phone}
          </div>
          <p className="mt-1 whitespace-pre-wrap">{wa.body}</p>
        </div>
      )}

      {/* Customer */}
      <section className="card space-y-3">
        {customer ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">{customer.name.trim().charAt(0)}</span>
              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold">{customer.name}</div>
                <div className="truncate text-sm text-muted">
                  {[customer.phone, customer.area].filter(Boolean).join(" · ")}
                  {customer.due > 0 && (
                    <span className="font-semibold text-red-600">
                      {" "}
                      · {money(customer.due)} {t("due")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ground text-muted" onClick={() => changeCustomer(null)} aria-label={t("cancel")}>
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : showNew ? (
          <div className="space-y-2">
            <div className="h2">{t("newCustomer")}</div>
            <input className="input" placeholder={t("name")} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
            <input className="input" placeholder={t("phone")} type="tel" inputMode="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
            <input className="input" placeholder={t("address")} value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} />
            <button className="text-sm font-semibold text-brand-600" onClick={() => setShowNew(false)}>
              {t("cancel")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="input flex items-center gap-2">
              <Icon name="users" size={20} className="shrink-0 text-muted" />
              <input
                className="w-full bg-transparent outline-none"
                placeholder={`${t("searchCustomers")} (${t("walkIn")})`}
                value={custQ}
                onChange={(e) => setCustQ(e.target.value)}
              />
            </label>
            {custResults.map((c) => (
              <button
                key={c.id}
                className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-ground px-3 text-left"
                onClick={() => {
                  changeCustomer(c.id);
                  setCustQ("");
                }}
              >
                <span>
                  <b>{c.name}</b> <span className="muted">{c.phone}</span>
                </span>
                {c.due > 0 && <span className="text-sm font-semibold text-red-600">{money(c.due)}</span>}
              </button>
            ))}
            <button className="btn-secondary btn-sm" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={18} /> {t("newCustomer")}
            </button>
          </div>
        )}
        {customer && hasLastRates && (
          <button
            className={`btn w-full ${oldOn ? "bg-purple-50 text-purple-700 ring-[1.5px] ring-inset ring-purple-600" : "bg-purple-600 text-white"}`}
            onClick={() => setOldRates(!oldOn)}
          >
            <Icon name={oldOn ? "check" : "undo"} size={18} />
            {oldOn ? `${t("oldRatesOn")} · ${t("masterRates")}` : t("oldRates")}
          </button>
        )}
      </section>

      {/* Search + quick add */}
      <section className="space-y-2.5">
        <label className="input flex items-center gap-2">
          <Icon name="search" size={20} className="shrink-0 text-muted" />
          <input className="w-full bg-transparent outline-none" placeholder={t("searchProducts")} value={prodQ} onChange={(e) => setProdQ(e.target.value)} />
        </label>
        {prodResults.length > 0 && (
          <div className="card divide-y divide-ground p-1.5">
            {prodResults.map((p) => (
              <button key={p.id} className="flex min-h-[52px] w-full items-center justify-between rounded-2xl px-2.5 text-left active:bg-brand-50" onClick={() => addProduct(p)}>
                <span>
                  <b>{pname(p, lang)}</b>
                  <span className="block text-[13px] text-muted">{lang === "hi" ? p.name : p.name_hi}</span>
                </span>
                <span className="text-right text-sm">
                  {money(rateFor(p, oldOn))}/{unitLabel(p.unit, lang)}
                  <span className={`block text-[13px] ${p.stock <= 0 ? "text-red-600" : "text-muted"}`}>
                    {t("stockLeft")}: {fmtQty(p.stock)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {!prodQ && quick.length > 0 && (
          <>
            <div className="px-1 text-sm font-medium text-muted">{t("quickAdd")}</div>
            <div className="flex flex-wrap gap-2">
              {quick.map((p) => (
                <button key={p.id} className="chip" onClick={() => addProduct(p)}>
                  + {pname(p, lang)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Lines */}
      {lines.length === 0 ? (
        <p className="card muted text-center">{t("noItems")}</p>
      ) : (
        <section className="space-y-2.5">
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
              <div key={l.productId} className={`card space-y-3 ${changed || overridden ? "ring-[1.5px] ring-inset ring-purple-300" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold leading-tight">{pname(p, lang)}</div>
                    <div className="text-[13px] text-muted">
                      {lang === "hi" ? p.name : p.name_hi} · {money(l.price)}/{unitLabel(p.unit, lang)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="amount text-[22px]">{money(amount)}</span>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted" onClick={() => removeLine(i)} aria-label={t("cancel")}>
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {smallUnit ? (
                    <div className="seg w-[168px] grid-cols-3">
                      <button className={seg(!l.byAmount && !l.small)} onClick={() => updateLine(i, { byAmount: false, typed: null, small: false })}>
                        {unitLabel(p.unit, lang)}
                      </button>
                      <button className={seg(!l.byAmount && l.small)} onClick={() => updateLine(i, { byAmount: false, typed: null, small: true })}>
                        {unitLabel(smallUnit, lang)}
                      </button>
                      <button className={seg(l.byAmount)} onClick={() => updateLine(i, { byAmount: true, typed: l.typed ?? (amount || null) })}>
                        ₹
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-xl bg-ground px-3 py-2 text-sm">{unitLabel(p.unit, lang)}</span>
                  )}
                  {l.byAmount ? (
                    <label className="input flex min-w-[120px] flex-1 items-center gap-1 text-lg font-semibold">
                      ₹
                      <input
                        className="w-full bg-transparent outline-none"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder={t("amount")}
                        value={l.typed ?? ""}
                        onChange={(e) => setTyped(i, Number(e.target.value))}
                        aria-label="amount in rupees"
                      />
                    </label>
                  ) : (
                    <div className="flex min-w-[150px] flex-1 items-center gap-1.5">
                      <button className="btn-secondary w-11 shrink-0 px-0 text-xl" onClick={() => setQty(i, Math.max(0, round3((shown - step) / factor)))} aria-label="−">
                        −
                      </button>
                      <input
                        className="input min-w-0 flex-1 px-1 text-center text-lg font-semibold"
                        type="number"
                        inputMode="decimal"
                        step={l.small ? 1 : 0.001}
                        min="0"
                        value={Number.isFinite(shown) ? shown : ""}
                        onChange={(e) => setQty(i, round3(Number(e.target.value) / factor))}
                        aria-label="quantity"
                      />
                      <button className="btn-secondary w-11 shrink-0 px-0 text-xl" onClick={() => setQty(i, round3((shown + step) / factor))} aria-label="+">
                        +
                      </button>
                    </div>
                  )}
                </div>

                {l.byAmount && l.qty > 0 && (
                  <div className="rounded-xl bg-green-50 px-3 py-2 text-[15px] font-semibold text-green-700">= {qtyUnit(l.qty, p.unit, lang)}</div>
                )}
                {extra > 0 && (
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    {t("smallQtyExtra")}: +{money(extra)}/{unitLabel(p.unit, lang)} → {money(rate)}/{unitLabel(p.unit, lang)}
                  </div>
                )}

                {canEditRate && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">
                      {t("rate")}/{unitLabel(p.unit, lang)}
                    </span>
                    <input
                      className={`input min-h-[40px] w-20 px-2 text-right ${changed ? "border-purple-600 font-bold text-purple-700" : ""}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={l.price}
                      onChange={(e) => setPrice(i, Number(e.target.value))}
                      aria-label="rate"
                    />
                    <span className="ml-auto text-muted">{t("amount")} ₹</span>
                    <input
                      className={`input min-h-[40px] w-24 px-2 text-right font-bold ${overridden ? "border-purple-600 text-purple-700" : ""}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => updateLine(i, { override: e.target.value === "" ? 0 : Number(e.target.value) })}
                      aria-label="line amount"
                    />
                  </div>
                )}
                {(changed || overridden || (last && last.price !== l.price)) && (
                  <div className="flex flex-wrap gap-2 text-[13px]">
                    {overridden && (
                      <button className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700" onClick={() => updateLine(i, { override: null })}>
                        {t("amountChanged")} · {money(auto)}
                      </button>
                    )}
                    {changed && (
                      <button className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700" onClick={() => setPrice(i, p.price)}>
                        {t("listRate")}: {money(p.price)}
                      </button>
                    )}
                    {last && last.price !== l.price && (
                      <button className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700" onClick={() => setPrice(i, last.price)}>
                        {t("lastRate")}: {money(last.price)} · {t("billLabel")} #{last.bill_no}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Payment & delivery */}
      <section className="card space-y-4">
        <div className="space-y-2">
          <div className="font-semibold">{t("payment")}</div>
          <div className="grid grid-cols-4 gap-2">
            {(["cash", "upi", "credit", "partial"] as const).map((m) => (
              <button key={m} className={`btn btn-sm min-h-[48px] px-1 leading-tight ${mode === m ? "bg-brand-600 text-white" : "bg-white ring-1 ring-inset ring-line"}`} onClick={() => setMode(m)}>
                {t(m)}
              </button>
            ))}
          </div>
          {mode === "partial" && (
            <input className="input" type="number" inputMode="decimal" min="0" placeholder={t("paidNow")} value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} />
          )}
          {(mode === "credit" || mode === "partial") && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {t("due")}: {money(mode === "credit" ? total : Math.max(0, total - paid))}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="font-semibold">{t("delivery")}</div>
          <div className="grid grid-cols-2 gap-2">
            {(["pickup", "home"] as const).map((d) => (
              <button key={d} className={`btn btn-sm min-h-[48px] ${delivery === d ? "bg-ink text-white" : "bg-white ring-1 ring-inset ring-line"}`} onClick={() => setDelivery(d)}>
                <Icon name={d === "home" ? "truck" : "store"} size={18} />
                {d === "home" ? t("home_delivery") : t("pickup")}
              </button>
            ))}
          </div>
        </div>
        {canEditRate && (
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{t("discount")}</span>
            <input className="input w-28 text-right" type="number" inputMode="decimal" min="0" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" />
          </div>
        )}
        <input className="input" placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </section>

      {/* Checkout bar (above the bottom tabs) */}
      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-10">
        <div className="mx-auto max-w-2xl rounded-t-3xl bg-white px-4 pb-3 pt-3 shadow-[0_-6px_20px_rgba(28,34,48,0.08)]">
          {error && <p className="mb-2 rounded-xl bg-red-600 p-2 text-center text-sm font-semibold text-white">{error}</p>}
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[13px] text-muted">
                {lines.length} {t("itemsCount")} · {t("total")}
                {canEditRate && discount > 0 ? ` (−${money(discount)})` : ""}
              </div>
              <div className="amount text-[28px] font-extrabold leading-none">{money(total)}</div>
            </div>
            <button className="btn-primary min-h-[56px] flex-1 rounded-[18px] font-display text-lg" disabled={pending} onClick={save}>
              {pending ? t("saving") : t("saveBill")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
