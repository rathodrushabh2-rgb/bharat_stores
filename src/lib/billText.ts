import { num, type Row } from "./db";
import { date, money, qty } from "./format";
import { unitLabel } from "./i18n";

/** Hindi plain-text bill for WhatsApp. */
export function billText(b: Row, items: Row[], settings: Record<string, string>) {
  const lines = [
    `*${settings.shop_name_hi || settings.shop_name}*`,
    `बिल नं. ${b.bill_no} · ${date(b.created_at)}`,
    b.cust_name ? `ग्राहक: ${b.cust_name}` : "",
    "",
    ...items.map((i) => `${i.name_hi || i.name} ${qty(i.qty)} ${unitLabel(i.unit, "hi")} × ${money(i.price)} = ${money(i.amount)}`),
    "",
    num(b.discount) > 0 ? `छूट: ${money(b.discount)}` : "",
    `*कुल: ${money(b.total)}*`,
    num(b.paid) < num(b.total) ? `जमा: ${money(b.paid)}\nबाकी: ${money(num(b.total) - num(b.paid))}` : "",
    "",
    settings.bill_footer || "धन्यवाद!",
  ];
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}
