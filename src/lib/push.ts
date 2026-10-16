import "server-only";
import webpush from "web-push";
import { sql } from "./db";

/** VAPID keys are created once and kept in the settings table, so no environment setup is needed. */
async function vapid(): Promise<{ publicKey: string; privateKey: string }> {
  const read = async () => {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('vapid_public', 'vapid_private')`;
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return m.vapid_public && m.vapid_private ? { publicKey: m.vapid_public, privateKey: m.vapid_private } : null;
  };
  const existing = await read();
  if (existing) return existing;
  const k = webpush.generateVAPIDKeys();
  // Two requests racing: the first insert wins and both read it back.
  await sql.transaction([
    sql`INSERT INTO settings (key, value) VALUES ('vapid_public', ${k.publicKey}) ON CONFLICT (key) DO NOTHING`,
    sql`INSERT INTO settings (key, value) VALUES ('vapid_private', ${k.privateKey}) ON CONFLICT (key) DO NOTHING`,
  ]);
  return (await read())!;
}

export async function pushPublicKey() {
  return (await vapid()).publicKey;
}

type Payload = { title: string; body: string; url: string; tag?: string };

/**
 * Sends a notification to subscribed phones of active users: everyone except `except`,
 * or only `only` when given. Drops subscriptions the browser has thrown away.
 */
export async function notify(payload: Payload, who: { except?: number | null; only?: number }) {
  const subs = await sql`SELECT s.id, s.endpoint, s.p256dh, s.auth FROM push_subs s JOIN users u ON u.id = s.user_id
                         WHERE u.active
                           AND (${who.only ?? null}::int IS NULL OR s.user_id = ${who.only ?? null}::int)
                           AND s.user_id IS DISTINCT FROM ${who.except ?? null}::int`;
  if (!subs.length) return;
  const keys = await vapid();
  webpush.setVapidDetails("mailto:shop@bharatstores.app", keys.publicKey, keys.privateKey);
  const body = JSON.stringify(payload);
  const dead: number[] = [];
  await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600, urgency: "high", timeout: 5000 })
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.id);
        }),
    ),
  );
  if (dead.length) await sql`DELETE FROM push_subs WHERE id = ANY(${dead})`;
}
