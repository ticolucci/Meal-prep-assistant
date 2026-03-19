"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const CONSENT_KEY = "automationConsentAccepted";

export default function ConsentGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  // Read localStorage once on first render (client only)
  if (!checked && typeof window !== "undefined") {
    const stored = localStorage.getItem(CONSENT_KEY) === "true";
    if (stored !== accepted) setAccepted(stored);
    setChecked(true);
  }

  const handleAccept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setAccepted(true);
  }, []);

  // Avoid flash: render nothing until we've read localStorage
  if (!checked) return null;

  if (accepted) return <>{children}</>;

  return (
    <div
      data-testid="consent-screen"
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/80 p-4 overflow-y-auto"
    >
      <div className="mt-8 mb-20 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Before You Use Cart Automation
        </h2>
        <p className="text-xs text-zinc-500 mb-5">
          Please read and accept this disclosure before using grocery automation
          features.
        </p>

        <section className="mb-5">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
            What this tool automates
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This app can automatically add items from your Shopping List to your
            grocery cart (e.g. Mathem or ICA) using browser automation
            (Playwright). It searches for each item and clicks &ldquo;Add to
            Cart&rdquo; on your behalf.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
            What this tool does NOT do
          </h3>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
            <li>
              Does not store, transmit, or access your credentials — you log in
              manually in your own browser.
            </li>
            <li>
              Will not place an order or proceed to checkout — you must review
              and confirm your cart before paying.
            </li>
            <li>
              Does not access your account without you being actively logged in.
            </li>
          </ul>
        </section>

        <section className="mb-5">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
            Your responsibility
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are responsible for reviewing your cart before confirming any
            order. Always verify the items, quantities, and prices before
            completing your purchase.
          </p>
        </section>

        <section className="mb-6">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
            Personal use only
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This is a personal productivity tool, not a commercial service. Use
            it responsibly and in accordance with the terms of service of any
            grocery platform you interact with.
          </p>
        </section>

        <div className="flex flex-col gap-3">
          <button
            data-testid="consent-accept-btn"
            onClick={handleAccept}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
          >
            I Understand — Accept &amp; Continue
          </button>
          <Link
            data-testid="consent-settings-link"
            href="/settings"
            className="text-center text-xs text-zinc-500 hover:text-zinc-700 underline"
          >
            View full System Capabilities
          </Link>
        </div>
      </div>
    </div>
  );
}
