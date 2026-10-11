export const validPin = (pin: string) => /^\d{4,6}$/.test(pin);
export const validUsername = (u: string) => /^[a-z0-9_.]{3,20}$/.test(u);

/** Parse a form number; returns null for empty / invalid. */
export function formNum(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const formStr = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
