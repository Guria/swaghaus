import { authClientAtom } from "./convex-client";

export const Logout = () => {
  return (
    <button
      className="btn"
      on:click={() =>
        authClientAtom
          .data()
          ?.logout({ logoutParams: { returnTo: window.location.origin } })
      }
    >
      Log out
    </button>
  );
};
