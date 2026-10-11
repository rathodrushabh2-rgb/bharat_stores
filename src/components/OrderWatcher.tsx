"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

/** Refreshes the page data every 15s and alerts when a bill newer than the last one seen arrives. */
export function OrderWatcher({ latestNewId, message }: { latestNewId: number; message: string }) {
  const router = useRouter();
  const [alert, setAlert] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => clearInterval(id);
  }, [router]);

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
    <Link href="/bills?status=new" onClick={() => setAlert(false)} className="no-print fixed inset-x-3 top-3 z-30 mx-auto max-w-md animate-bounce rounded-xl bg-green-600 p-4 text-center font-bold text-white shadow-lg">
      🔔 {message}
    </Link>
  );
}
