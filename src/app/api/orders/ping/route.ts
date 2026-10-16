import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Cheap check for the shop phone: newest open order (not made by me) and how many are waiting. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const [r] = await sql`SELECT count(*)::int AS n, coalesce(max(id) FILTER (WHERE created_by IS DISTINCT FROM ${user.id}), 0)::int AS latest,
                               coalesce(max(id), 0)::int AS newest
                        FROM bills WHERE status = 'new'`;
  return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
}
