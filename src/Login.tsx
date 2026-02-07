import { authClientAtom } from "./convex-client";

export const Login = () => {
  return (
    <button
      className="btn"
      on:click={() => authClientAtom.data()?.loginWithRedirect()}
    >
      Sign in
    </button>
  );
};
