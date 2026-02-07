import { authClientAtom } from "./convex-client";
import { reatomComponent } from "@reatom/react";

export const Logout = reatomComponent(function Logout() {
  const client = authClientAtom.data();

  return (
    <button
      className="btn"
      onClick={() =>
        client?.logout({ logoutParams: { returnTo: window.location.origin } })
      }
    >
      Log out
    </button>
  );
})
