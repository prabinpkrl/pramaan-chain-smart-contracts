import {
  readEvidence,
  readRuntimeEnvIfPresent,
} from "./deployment-runtime.js";

console.log(JSON.stringify({
  runtime: readRuntimeEnvIfPresent(),
  evidence: readEvidence(),
}, null, 2));
