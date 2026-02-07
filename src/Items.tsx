import { reatomFactoryComponent } from "@reatom/react";
import { api } from "../convex/_generated/api";
import { Item } from "./Item";
import { reatomQuery } from "./convex-client";

export const Items = reatomFactoryComponent(function Items() {
  const items = reatomQuery(api.items.list, () => ({}));

  return () => (
    <div className="flex flex-col gap-4">
      {items()?.map((item) => (
        <Item item={item} key={item._id.toString()} />
      ))}
    </div>
  );
})
