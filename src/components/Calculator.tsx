"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { pname, qtyUnit, SMALL_UNIT, translator, unitLabel, type Lang } from "@/lib/i18n";
import { lineAmount, qtyForAmount, smallQtyExtra, type SmallQtyRule } from "@/lib/pricing";
import { Icon } from "./Icon";

type Product = { id: number; name: string; name_hi: string | null; unit: string; price: number };

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Counter calculator: money → weight and weight → money, with the same small-quantity rule as bills. */
export function Calculator({ products, rule, lang }: { products: Product[]; rule: SmallQtyRule; lang: Lang }) {
  const t = translator(lang);
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [custom, setCustom] = useState(false);
  const [rate, setRate] = useState(0);
  const [unit, setUnit] = useState("kg");
  const [mode, setMode] = useState<"money" | "weight">("money");
  const [amount, setAmount] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [small, setSmall] = useState(true); // weight typed in g/ml

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products.filter((p) => `${p.name} ${p.name_hi ?? ""}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, products]);

  const loose = !!SMALL_UNIT[unit]; // sold by weight/volume
  const smallUnit = SMALL_UNIT[unit];
  const ready = (product || custom) && rate > 0;

  function pick(p: Product) {
    setProduct(p);
    setCustom(false);
    setRate(p.price);
    setUnit(p.unit);
    setSmall(!!SMALL_UNIT[p.unit]);
    setQ("");
  }

  // ₹ → quantity
  const toQty = (amt: number) => {
    if (!(amt > 0) || !(rate > 0)) return null;
    if (loose) {
      const qty = qtyForAmount(amt, rate, unit, rule);
      const extra = smallQtyExtra(unit, qty, rule);
      return { qty, extra, effRate: round2(rate + extra), pieces: 0, change: 0 };
    }
    const pieces = Math.floor(amt / rate + 1e-9);
    return { qty: pieces, extra: 0, effRate: rate, pieces, change: round2(amt - pieces * rate) };
  };
  // quantity → ₹
  const toAmount = (qty: number) => {
    if (!(qty > 0) || !(rate > 0)) return null;
    const extra = smallQtyExtra(unit, qty, rule);
    const effRate = round2(rate + extra);
    return { amount: lineAmount(qty, effRate), extra, effRate };
  };

  const byMoney = typeof amount === "number" ? toQty(amount) : null;
  const typedQty = typeof weight === "number" ? round3(loose && small ? weight / 1000 : weight) : 0;
  const byWeight = toAmount(typedQty);

  const quickMoney = [10, 20, 30, 50, 100, 200];
  const quickQty = loose ? [0.1, 0.25, 0.5, 1, 2, 5] : [1, 2, 3, 5, 10, 12];

  return (
    <div className="space-y-4">
      {/* Product */}
      <section className="card space-y-3">
        {product || custom ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{product ? pname(product, lang) : t("anyRate")}</div>
              {product && <div className="text-[13px] text-muted">{lang === "hi" ? product.name : product.name_hi}</div>}
            </div>
            <button
              className="btn-secondary btn-sm shrink-0"
              onClick={() => {
                setProduct(null);
                setCustom(false);
              }}
            >
              {t("changeProduct")}
            </button>
          </div>
        ) : (
          <>
            <label className="input flex items-center gap-2">
              <Icon name="search" size={20} className="shrink-0 text-muted" />
              <input className="w-full bg-transparent outline-none" placeholder={t("searchProducts")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            </label>
            {results.map((p) => (
              <button key={p.id} className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-ground px-3 text-left" onClick={() => pick(p)}>
                <span>
                  <b>{pname(p, lang)}</b> <span className="text-[13px] text-muted">{lang === "hi" ? p.name : p.name_hi}</span>
                </span>
                <span className="text-sm">
                  {money(p.price)}/{unitLabel(p.unit, lang)}
                </span>
              </button>
            ))}
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                setCustom(true);
                setProduct(null);
                setRate(0);
                setUnit("kg");
                setSmall(true);
              }}
            >
              {t("anyRate")}
            </button>
          </>
        )}

        {(product || custom) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">{t("rate")} ₹</span>
            <input
              className="input min-h-[44px] w-24 text-right font-bold"
              type="number"
              inputMode="decimal"
              min="0"
              value={rate || ""}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-label="rate"
            />
            <span className="text-sm text-muted">/</span>
            {custom ? (
              <div className="seg grid-cols-3">
                {["kg", "litre", "pcs"].map((u) => (
                  <button key={u} className={`seg-btn ${unit === u ? "seg-dark" : ""}`} onClick={() => setUnit(u)}>
                    {unitLabel(u, lang)}
                  </button>
                ))}
              </div>
            ) : (
              <span className="font-semibold">{unitLabel(unit, lang)}</span>
            )}
          </div>
        )}
        {ready && unit === "kg" && rule.extraPerKg > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            {t("smallQtyExtra")}: {Math.round(rule.uptoKg * 1000)} {unitLabel("g", lang)} {t("orLess")} +{money(rule.extraPerKg)}/{unitLabel("kg", lang)}
          </p>
        )}
      </section>

      {ready && (
        <>
          {/* Mode */}
          <div className="seg grid-cols-2">
            <button className={`seg-btn ${mode === "money" ? "seg-on" : ""}`} onClick={() => setMode("money")}>
              {loose ? t("moneyToWeight") : `₹ → ${t("qty")}`}
            </button>
            <button className={`seg-btn ${mode === "weight" ? "seg-on" : ""}`} onClick={() => setMode("weight")}>
              {loose ? t("weightToMoney") : `${t("qty")} → ₹`}
            </button>
          </div>

          {mode === "money" ? (
            <section className="card space-y-3">
              <label className="input flex items-center gap-2 text-2xl font-bold">
                ₹
                <input
                  className="w-full bg-transparent outline-none"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  aria-label="amount in rupees"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {quickMoney.map((m) => (
                  <button key={m} className="chip" onClick={() => setAmount(m)}>
                    ₹{m}
                  </button>
                ))}
              </div>
              {byMoney && (
                <div className="rounded-2xl bg-green-50 p-4 text-green-700">
                  <div className="text-sm font-medium">{t("giveWeight")}</div>
                  <div className="amount text-4xl font-extrabold leading-tight" data-testid="calc-result">
                    {loose ? qtyUnit(byMoney.qty, unit, lang) : `${byMoney.pieces} ${unitLabel(unit, lang)}`}
                  </div>
                  <div className="mt-1 text-sm">
                    @ {money(byMoney.effRate)}/{unitLabel(unit, lang)}
                    {byMoney.extra > 0 && ` (${t("smallQtyExtra")} +${money(byMoney.extra)})`}
                    {!loose && byMoney.change > 0 && ` · ${t("changeBack")}: ${money(byMoney.change)}`}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="card space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1 text-2xl font-bold"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                  aria-label="quantity"
                />
                {loose ? (
                  <div className="seg grid-cols-2">
                    {[true, false].map((sm) => (
                      <button
                        key={String(sm)}
                        className={`seg-btn px-3 ${small === sm ? "seg-dark" : ""}`}
                        onClick={() => {
                          if (typeof weight === "number" && sm !== small) setWeight(round3(sm ? weight * 1000 : weight / 1000));
                          setSmall(sm);
                        }}
                      >
                        {unitLabel(sm ? smallUnit : unit, lang)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="font-semibold">{unitLabel(unit, lang)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {quickQty.map((qq) => (
                  <button
                    key={qq}
                    className="chip"
                    onClick={() => {
                      setWeight(loose && small ? round3(qq * 1000) : qq);
                    }}
                  >
                    {qtyUnit(qq, unit, lang)}
                  </button>
                ))}
              </div>
              {byWeight && (
                <div className="rounded-2xl bg-brand-50 p-4 text-brand-700">
                  <div className="text-sm font-medium">{t("chargeAmount")}</div>
                  <div className="amount text-4xl font-extrabold leading-tight" data-testid="calc-result">
                    {money(byWeight.amount)}
                  </div>
                  <div className="mt-1 text-sm">
                    {qtyUnit(typedQty, unit, lang)} @ {money(byWeight.effRate)}/{unitLabel(unit, lang)}
                    {byWeight.extra > 0 && ` (${t("smallQtyExtra")} +${money(byWeight.extra)})`}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Ready table */}
          <section className="card">
            <h2 className="h2 mb-2">{t("quickTable")}</h2>
            <div className="grid grid-cols-2 gap-x-6 text-[15px]">
              <div>
                {quickMoney.map((m) => {
                  const r = toQty(m);
                  return (
                    <div key={m} className="list-row py-2">
                      <span className="text-muted">₹{m}</span>
                      <b>{r ? (loose ? qtyUnit(r.qty, unit, lang) : `${r.pieces} ${unitLabel(unit, lang)}`) : "—"}</b>
                    </div>
                  );
                })}
              </div>
              <div>
                {quickQty.map((qq) => {
                  const r = toAmount(qq);
                  return (
                    <div key={qq} className="list-row py-2">
                      <span className="text-muted">{qtyUnit(qq, unit, lang)}</span>
                      <b>{r ? money(r.amount) : "—"}</b>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
      <p className="muted px-1 text-center text-[13px]">{t("calcNote")}</p>
    </div>
  );
}
