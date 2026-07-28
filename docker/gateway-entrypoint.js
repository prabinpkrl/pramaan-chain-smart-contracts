import { loadDeploymentRuntime } from "./load-runtime-env.js";

loadDeploymentRuntime();

const { start } = await import("./src/server.js");
await start();
