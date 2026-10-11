const TZ = "Asia/Kolkata";

export function money(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function qty(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function dateTime(v: string | Date | null | undefined) {
  if (!v) return "";
  return new Date(v).toLocaleString("en-IN", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function date(v: string | Date | null | undefined) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
}

/** Digits only, with the 91 country code, for wa.me links. */
export function waPhone(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 10) return "91" + d;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
  return d;
}

export function waLink(phone: string | null | undefined, text: string) {
  const p = waPhone(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
