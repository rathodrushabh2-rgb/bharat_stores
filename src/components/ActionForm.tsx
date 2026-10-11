"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";

export type ActionResult = { error?: string; ok?: string } | void;
type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const PendingCtx = createContext(false);

/**
 * Form wrapper for server actions that shows the returned error/success message.
 * Submits manually so the inputs are kept when the action returns an error.
 */
export function ActionForm({ action, children, className, resetOnOk }: { action: Action; children: React.ReactNode; className?: string; resetOnOk?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      {state?.error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({ children, className = "btn-primary w-full", confirm, name, value }: { children: React.ReactNode; className?: string; confirm?: string; name?: string; value?: string }) {
  const pending = useContext(PendingCtx);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
