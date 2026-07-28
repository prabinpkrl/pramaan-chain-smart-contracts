import {
  readEvidence,
  readRuntimeEnv,
} from "./deployment-runtime.js";

console.log(JSON.stringify({
  runtime: readRuntimeEnv(),
  evidence: readEvidence(),
}, null, 2));
