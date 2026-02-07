import { reatomComponent } from "@reatom/react";
import { authClientAtom } from "./convex-client";

export const Login = reatomComponent(function Login() {
  const client = authClientAtom.data();
  return (
    <button className="btn" onClick={() => client?.loginWithRedirect()}>
      Sign in
    </button>
  );
})
