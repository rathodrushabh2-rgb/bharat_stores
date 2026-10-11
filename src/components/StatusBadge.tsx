import type { Key } from "@/lib/i18n";

const COLORS: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  packed: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-stone-200 text-stone-500 line-through",
};

export function StatusBadge({ status, t }: { status: string; t: (k: Key) => string }) {
  return <span className={`badge ${COLORS[status]}`}>{t(`st_${status}` as Key)}</span>;
}
