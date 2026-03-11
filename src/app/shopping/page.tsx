export const dynamic = "force-dynamic";

import { getShoppingList } from "@/app/actions/shopping";
import ShoppingListClient from "@/components/ShoppingListClient";

export default async function ShoppingPage() {
  const { planId, items, adHocItems, pantryItems } = await getShoppingList();

  const totalItems = items.length + adHocItems.length;

  return (
    <div className="p-4 pb-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Shopping List
        </h1>
        {planId != null && (
          <p className="mt-1 text-sm text-zinc-500">
            {totalItems} item{totalItems !== 1 ? "s" : ""} to buy
          </p>
        )}
      </div>

      <ShoppingListClient
        planId={planId}
        items={items}
        adHocItems={adHocItems}
        pantryItems={pantryItems}
      />
    </div>
  );
}
