import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { client, reatomMutation } from "./convex-client";
import { reatomItem } from "./items.model";

export const Item = ({ itemId }: { itemId: Doc<"items">["_id"] }) => {
  const item = reatomItem(itemId);
  const addCart = reatomMutation(api.cart.add);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <>
      {() => {
        const currentItem = item();
        if (!currentItem) {
          return null;
        }

        return (
          <div className="flex flex-row gap-4 items-center">
            <img className="w-40" src={currentItem.image} />
            <div className="flex flex-col">
              <div className="text-lg font-bold">{currentItem.name}</div>
              <div>{currentItem.description}</div>
              <div className="font-bold">{formatter.format(currentItem.price)}</div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-x-4 gap-y-1 my-4">
                <button
                  className="btn"
                  on:click={() => addCart({ itemId: currentItem._id })}
                  disabled={() => !client.isAuthenticated()}
                >
                  Add to Cart
                </button>
                <div>({currentItem.remaining} remaining)</div>
              </div>
            </div>
          </div>
        );
      }}
    </>
  );
};
