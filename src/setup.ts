import { connectLogger, log } from "@reatom/core";

if (import.meta.env.DEV) {
  connectLogger();
}

declare global {
  let LOG: typeof log;
}

globalThis.LOG = log;
