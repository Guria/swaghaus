import { signIn } from "./convex-client";

export const Login = () => {
  return (
    <button
      className="btn"
      on:click={() => void signIn()}
    >
      Sign in
    </button>
  );
};
