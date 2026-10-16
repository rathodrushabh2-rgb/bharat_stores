"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "bs_last_seen_bill";

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.2;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.15);
    });
  } catch {}
}

function istHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
}

/** True inside the quiet window, e.g. 23 → 9 means 11 PM to 9 AM. */
export function isQuiet(hour: number, from: number, to: number) {
  if (from === to) return false;
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

/**
 * Backup to push notifications: checks for new orders every `intervalMs` (not during quiet hours)
 * and whenever the app comes to the front; reloads the screen only when something changed.
 */
export function OrderWatcher({
  latestNewId,
  openCount,
  message,
  quietFrom,
  quietTo,
  intervalMs = 10 * 60 * 1000,
}: {
  latestNewId: number;
  openCount: number;
  message: string;
  quietFrom: number;
  quietTo: number;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [alert, setAlert] = useState(false);
  const known = useRef({ latest: latestNewId, n: openCount });
  known.current = { latest: latestNewId, n: openCount };

  const check = useCallback(
    async (ignoreQuiet: boolean) => {
      if (document.visibilityState !== "visible") return;
      if (!ignoreQuiet && isQuiet(istHour(), quietFrom, quietTo)) return;
      try {
        const r = await fetch("/api/orders/ping", { cache: "no-store" });
        if (!r.ok) return;
        const { latest, n } = await r.json();
        if (latest !== known.current.latest || n !== known.current.n) router.refresh();
      } catch {}
    },
    [router, quietFrom, quietTo],
  );

  useEffect(() => {
    const id = setInterval(() => check(false), intervalMs);
    const onShow = () => document.visibilityState === "visible" && check(true);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [check, intervalMs]);

  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(KEY) ?? 0);
    } catch {}
    if (latestNewId > seen) {
      if (seen > 0) {
        setAlert(true);
        beep();
        navigator.vibrate?.([200, 100, 200]);
      }
      try {
        localStorage.setItem(KEY, String(latestNewId));
      } catch {}
    }
  }, [latestNewId]);

  if (!alert) return null;
  return (
    <Link
      href="/bills?status=new"
      onClick={() => setAlert(false)}
      className="no-print fixed inset-x-3 top-3 z-30 mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-green-600 p-4 font-display text-lg font-bold text-white shadow-lg"
    >
      {message}
    </Link>
  );
}
