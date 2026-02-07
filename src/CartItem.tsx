import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { reatomMutation } from "./convex-client";

export const CartItem = ({
  cartItem,
  item,
}: {
  cartItem: Doc<"carts">;
  item: Doc<"items">;
}) => {
  const removeCart = reatomMutation(api.cart.remove);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="flex flex-row gap-4 mx-4 items-center">
      <img className="w-20 md:w-32" src={item.image} />
      <div>
        <div className="text-sm md:text-lg font-bold">{item.name}</div>
        <div className="text-sm md:text-base">{cartItem.count} in cart</div>
        <div className="text-sm md:text-base">
          Total:{" "}
          <span className="font-bold">
            {formatter.format(cartItem.count * item.price)}
          </span>
        </div>
        <button
          className="btn text-sm md:text-base"
          on:click={() => removeCart({ cartItemId: cartItem._id })}
        >
          Remove
        </button>
      </div>
    </div>
  );
};
