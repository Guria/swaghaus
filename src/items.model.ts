import { computed, reatomMap, type Computed } from "@reatom/core";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { reatomQuery } from "./convex-client";

type ItemDoc = Doc<"items">;
type ItemId = ItemDoc["_id"];

export const items = reatomQuery(api.items.list, "items.query");

const itemAtomCache = reatomMap<ItemId, Computed<ItemDoc | undefined>>(
  new Map(),
  "items.byId",
);

export const reatomItem = (itemId: ItemId) =>
  itemAtomCache.getOrCreate(
    itemId,
    () =>
      computed(
        () => items()?.find((item) => item._id === itemId),
        `items.byId.${String(itemId)}`,
      ),
  );
