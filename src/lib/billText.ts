import { num, type Row } from "./db";
import { date, money } from "./format";
import { hiName, qtyUnit } from "./i18n";

/** Hindi plain-text bill for WhatsApp. */
export function billText(b: Row, items: Row[], settings: Record<string, string>) {
  const lines = [
    `*${settings.shop_name_hi || settings.shop_name}*`,
    `बिल नं. / Bill No. ${b.bill_no} · ${date(b.created_at)}`,
    b.cust_name ? `ग्राहक / Customer: ${b.cust_name}` : "",
    "",
    ...items.map(
      (i) =>
        `${hiName(i)} (${i.name})\n   ${qtyUnit(i.qty, i.unit, "hi")} = ${money(i.amount)}`,
    ),
    "",
    num(b.discount) > 0 ? `छूट / Discount: ${money(b.discount)}` : "",
    `*कुल / Total: ${money(b.total)}*`,
    num(b.paid) < num(b.total) ? `जमा / Paid: ${money(b.paid)}\nबाकी / Due: ${money(num(b.total) - num(b.paid))}` : "",
    "",
    settings.bill_footer || "धन्यवाद!",
  ];
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}
