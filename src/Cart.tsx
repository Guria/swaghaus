import { api } from "../convex/_generated/api";
import { CartItem as CartItem } from "./CartItem";
import { authClientAtom, reatomQuery } from "./convex-client";
import { computed, withAsyncData } from "@reatom/core";

export const Cart = () => {
  const user = computed(async () => {
    const client = authClientAtom.data();
    return client ? await client.getUser() : undefined;
  }).extend(withAsyncData());
  const cartItems = reatomQuery(api.cart.list, () => ({}));

  return (
    <div className="shadow shadow-black w-full pb-4 sm:min-h-80">
      <div className="text-center text-xl p-4 font-bold">
        {() => {
          const name = user.data()?.name;
          return name ? `${name}'s Cart` : "Cart";
        }}
      </div>
      <div className="flex flex-col gap-4 p-2">
        {() =>
          cartItems()?.map(({ cartItem, item }) => (
            <CartItem cartItem={cartItem} item={item} />
          ))
        }
      </div>
    </div>
  );
};
