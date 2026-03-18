import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="p-4 pb-8 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          data-testid="settings-back-link"
          href="/shopping"
          className="text-sm text-zinc-500 hover:text-zinc-700 underline"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
      </div>

      <section
        data-testid="system-capabilities-section"
        className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          System Capabilities
        </h2>

        <div className="space-y-5 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              What this app automates
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                AI-powered recipe parsing — paste a URL or raw text to extract
                ingredients and steps automatically.
              </li>
              <li>
                Weekly meal planning — generates a suggested menu from your
                recipe library.
              </li>
              <li>
                Smart shopping list — aggregates ingredients from your approved
                plan and groups them by supermarket aisle.
              </li>
              <li>
                Grocery cart automation — adds your shopping list items to your
                online grocery cart (e.g. Mathem, ICA) using browser
                automation. You must be logged in first.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              What this app does NOT do
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Will not store, transmit, or manage your grocery account
                credentials.
              </li>
              <li>
                Will not place an order or proceed to checkout on your behalf.
              </li>
              <li>
                Does not access grocery accounts without you being actively
                logged in.
              </li>
              <li>
                Does not guarantee item availability — out-of-stock items are
                returned as &ldquo;missed items&rdquo; for manual review.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Your responsibility
            </h3>
            <p>
              You must review your cart and verify all items, quantities, and
              prices before confirming any order. This tool assists — it does
              not replace your judgment.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Personal use
            </h3>
            <p>
              This is a personal productivity tool, not a commercial service.
              Use it responsibly and in accordance with the terms of service of
              any grocery platform you interact with.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
