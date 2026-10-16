"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPushKey, removePushSub, savePushSub, testPush } from "@/app/actions/push";
import { translator, type Lang } from "@/lib/i18n";
import { Icon } from "./Icon";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

function urlB64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js");
}

/** New-order notifications on this phone: a full card (More page) or a prompt banner (when off). */
export function PushToggle({ lang, banner }: { lang: Lang; banner?: boolean }) {
  const t = translator(lang);
  const path = usePathname();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
      try {
        if (banner && localStorage.getItem("bs_push_banner_hidden") === "1") setHidden(true);
      } catch {}
    })().catch(() => setState("unsupported"));
  }, [banner]);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      const key = await getPushKey();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await savePushSub(json);
      setState("on");
      await testPush();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSub(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (banner) {
    if (state !== "off" || hidden || path === "/more") return null;
    return (
      <div className="no-print mb-4 flex items-center gap-3 rounded-[20px] bg-ink p-3.5 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Icon name="bell" size={20} />
        </span>
        <span className="min-w-0 flex-1 text-sm leading-snug">{t("pushPrompt")}</span>
        <button className="btn-primary btn-sm shrink-0" disabled={busy} onClick={turnOn}>
          {t("turnOn")}
        </button>
        <button
          aria-label={t("cancel")}
          className="shrink-0 p-1 text-white/70"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem("bs_push_banner_hidden", "1");
            } catch {}
          }}
        >
          <Icon name="x" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${state === "on" ? "bg-green-50 text-green-600" : "bg-ground text-muted"}`}>
          <Icon name="bell" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t("pushTitle")}</div>
          <div className="text-sm text-muted">
            {state === "on" && t("pushOn")}
            {state === "off" && t("pushOff")}
            {state === "denied" && t("pushDenied")}
            {state === "unsupported" && t("pushUnsupported")}
            {state === "loading" && "…"}
          </div>
        </div>
      </div>
      {state === "off" && (
        <button className="btn-primary w-full" disabled={busy} onClick={turnOn}>
          <Icon name="bell" size={20} /> {t("turnOn")}
        </button>
      )}
      {state === "on" && (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" disabled={busy} onClick={() => testPush()}>
            {t("pushTest")}
          </button>
          <button className="btn-secondary" disabled={busy} onClick={turnOff}>
            {t("turnOff")}
          </button>
        </div>
      )}
      {msg && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}
