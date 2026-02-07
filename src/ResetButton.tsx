import { reatomFactoryComponent } from "@reatom/react";
import { api } from "../convex/_generated/api";
import { reatomMutation } from "./convex-client";

export const ResetButton = reatomFactoryComponent(function ResetButton() {
  const reset = reatomMutation(api.items.reset);

  return () => (
    <button className="btn" onClick={() => reset({})}>
      Reset app
    </button>
  );
})
