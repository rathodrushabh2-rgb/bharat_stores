// Small-quantity pricing for loose goods, shared by the bill screen and the server.
// Rule: for KG items, a quantity at or below `uptoKg` is charged `extraPerKg` more per kg.

export type SmallQtyRule = { extraPerKg: number; uptoKg: number };

export const DEFAULT_RULE: SmallQtyRule = { extraPerKg: 4, uptoKg: 0.25 };

export function ruleFromSettings(s: Record<string, string>): SmallQtyRule {
  const extra = Number(s.small_qty_extra);
  const uptoG = Number(s.small_qty_upto_g);
  return {
    extraPerKg: Number.isFinite(extra) && extra >= 0 ? extra : DEFAULT_RULE.extraPerKg,
    uptoKg: Number.isFinite(uptoG) && uptoG >= 0 ? uptoG / 1000 : DEFAULT_RULE.uptoKg,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Extra ₹/kg for this line (0 when the rule does not apply). */
export function smallQtyExtra(unit: string, qty: number, rule: SmallQtyRule): number {
  return unit === "kg" && qty > 0 && qty <= rule.uptoKg + 1e-9 ? rule.extraPerKg : 0;
}

/**
 * Weight for a money amount ("₹30 of sugar"). Uses the normal rate if that gives more than the
 * small-quantity limit, otherwise the rate with the extra charge.
 */
export function qtyForAmount(amount: number, baseRate: number, unit: string, rule: SmallQtyRule): number {
  if (!(amount > 0) || !(baseRate > 0)) return 0;
  const atBase = amount / baseRate;
  if (unit !== "kg" || atBase > rule.uptoKg + 1e-9) return round3(atBase);
  return round3(amount / (baseRate + rule.extraPerKg));
}

/** Line amount: an amount typed by the user is kept when the weight matches it (to the gram). */
export function lineAmount(qty: number, rate: number, typedAmount?: number | null): number {
  const exact = round2(qty * rate);
  if (typedAmount && typedAmount > 0 && Math.abs(typedAmount - qty * rate) <= rate * 0.0005 + 0.01) return round2(typedAmount);
  return exact;
}
