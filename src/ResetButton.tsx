import { api } from "../convex/_generated/api";
import { reatomMutation } from "./convex-client";

export const ResetButton = () => {
  const reset = reatomMutation(api.items.reset);

  return (
    <button className="btn" on:click={() => reset({})}>
      Reset app
    </button>
  );
};
