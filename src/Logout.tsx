import { signOut } from "./convex-client";

export const Logout = () => {
  return (
    <button
      className="btn"
      on:click={() => void signOut()}
    >
      Log out
    </button>
  );
};
