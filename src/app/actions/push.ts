"use server";

import { requireUser } from "@/lib/auth";
import { auditQuery, sql } from "@/lib/db";
import { notify, pushPublicKey } from "@/lib/push";

export async function getPushKey() {
  await requireUser();
  return pushPublicKey();
}

export async function savePushSub(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const me = await requireUser();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "bad subscription" };
  await sql.transaction([
    sql`INSERT INTO push_subs (user_id, endpoint, p256dh, auth) VALUES (${me.id}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
        ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    auditQuery(me.id, "push_on", "user", me.id),
  ]);
  return { ok: true };
}

export async function removePushSub(endpoint: string) {
  const me = await requireUser();
  await sql`DELETE FROM push_subs WHERE endpoint = ${endpoint} AND user_id = ${me.id}`;
}

/** Sends a test notification to this user's own phones. */
export async function testPush() {
  const me = await requireUser();
  await notify({ title: "भारत स्टोर्स ✓", body: "सूचना चालू है / Notifications are on", url: "/bills", tag: "test" }, { only: me.id });
  return { ok: true };
}
