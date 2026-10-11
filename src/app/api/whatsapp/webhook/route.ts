import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";

// WhatsApp Business Cloud API webhook (Meta). See docs/WHATSAPP.md for setup.

/** Meta calls this once to verify the webhook URL. */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === token) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const names = new Map<string, string>((value.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]));
      for (const m of value.messages ?? []) {
        let text: string | null = null;
        if (m.type === "text") text = m.text?.body;
        else if (m.type === "image" || m.type === "document") text = `[${m.type}] ${m[m.type]?.caption ?? ""}`.trim();
        else if (m.type === "audio") text = "[voice note / आवाज़ संदेश]";
        if (!text) continue;
        await sql`INSERT INTO wa_messages (wa_id, from_phone, from_name, body, received_at)
                  VALUES (${m.id}, ${m.from}, ${names.get(m.from) ?? null}, ${text}, to_timestamp(${Number(m.timestamp) || Date.now() / 1000}))
                  ON CONFLICT (wa_id) DO NOTHING`;
      }
    }
  }
  return NextResponse.json({ ok: true });
}
