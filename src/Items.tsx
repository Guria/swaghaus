import { Item } from "./Item";
import { items } from "./items.model";

export const Items = () => {
  return (
    <div className="flex flex-col gap-4">
      {() => items()?.map((item) => <Item itemId={item._id} />)}
    </div>
  );
};
