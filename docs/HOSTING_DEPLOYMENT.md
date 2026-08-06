# Render and Vercel Deployment

This guide hosts the existing PramaanChain prototype without redeploying its
Sepolia contract:

- Render runs the public blockchain gateway from its Dockerfile.
- Render runs the private application backend from its Dockerfile.
- Vercel builds and serves the React/Vite frontend.
- Vercel rewrites proxy browser API requests to the two Render services.

This is a fellowship demonstration deployment, not production infrastructure.
Render's free services sleep when idle and do not preserve the local SQLite
database or in-memory gateway index across restarts.

## 1. Deployment identity

The hosted services must use the existing reviewed Sepolia deployment.

| Item | Value |
| --- | --- |
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Contract | `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84` |
| Deployment block | `11318772` |
| Gateway URL | `https://pramaan-chain-smart-contracts.onrender.com` |
| Application backend URL | `https://pramaan-chain-smart-contracts-1.onrender.com` |
| Frontend URL | `https://pramaanchainapp.vercel.app` |

The similar Render service names do not affect routing. The URLs identify the
services. The configured production origin is
`https://pramaanchainapp.vercel.app`. Do not deploy another contract or send a
Sepolia transaction as part of hosting.

## 2. Required accounts and source

Required:

- The GitHub repository on the `master` branch
- A Render account connected to the GitHub repository
- A Vercel account connected to the GitHub repository
- A server-side Sepolia RPC endpoint

The RPC must report chain ID `11155111`, expose deployed bytecode, and support
historical `eth_getLogs` from block `11318772` for gateway index features. A
credentialed RPC URL is a backend secret. Never add it to Vercel or a `VITE_*`
variable.

## 3. Shared Render deployment runtime

Both Render containers load the public contract identity from the same runtime
file. In Render, create an environment group and add a secret file named
`runtime.env` with these contents:

```dotenv
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
PRAMAAN_CHAIN_START_BLOCK=11318772
```

Attach the environment group to both services. Render exposes the file inside
each Docker container at `/etc/secrets/runtime.env`. Set this environment
variable on both services:

```dotenv
DEPLOYMENT_RUNTIME_PATH=/etc/secrets/runtime.env
```

These contract values are public, but using one managed file prevents the two
services from drifting to different deployments.

## 4. Public gateway on Render

Create a Render **Web Service** from the GitHub repository.

| Setting | Value |
| --- | --- |
| Runtime | Docker |
| Branch | `master` |
| Root directory | Repository root |
| Dockerfile | `docker/gateway.Dockerfile` |
| Docker build context | `.` |
| Plan | Free for the prototype |
| Health-check path | `/api/health` |

Add these runtime variables:

```dotenv
DEPLOYMENT_RUNTIME_PATH=/etc/secrets/runtime.env
SEPOLIA_RPC_URL=YOUR_SERVER_SIDE_SEPOLIA_RPC
CORS_ALLOWED_ORIGINS=https://YOUR-PROJECT.vercel.app
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CONFIRMATIONS=2
TRUST_PROXY=false
WRITE_API_KEY=
PORT=3000
```

Do not configure `ISSUER_PRIVATE_KEY`, `ISSUER_ADDRESS`, or a write API key for
the normal browser-wallet application. The gateway remains read-only.

Deploy and test:

```text
https://pramaan-chain-smart-contracts.onrender.com/api/health
```

A healthy response reports `status: "ok"`, chain ID `11155111`, the current
block, and certificate-index state. Index-dependent routes can remain degraded
when the RPC rejects historical log queries; direct certificate verification
is a separate read path.

Do not set an extremely small `EVENT_QUERY_CHUNK_SIZE` merely to satisfy an RPC
range limit. Rebuilding from the deployment block with tiny ranges can exhaust
free RPC throughput and cause health requests to fail. Use an RPC that supports
the required history or accept degraded index routes for a temporary demo.

## 5. Private application backend on Render

Generate a stable 32-byte encryption key locally:

```bash
openssl rand -base64 32
```

Store the output directly in Render as `APP_DATA_ENCRYPTION_KEY`. Do not commit,
print in deployment evidence, or add it to Vercel.

Create the second Render **Web Service**:

| Setting | Value |
| --- | --- |
| Runtime | Docker |
| Branch | `master` |
| Root directory | Repository root |
| Dockerfile | `docker/app-backend.Dockerfile` |
| Docker build context | `.` |
| Plan | Free for the prototype |
| Health-check path | `/api/health` |

Add:

```dotenv
DEPLOYMENT_RUNTIME_PATH=/etc/secrets/runtime.env
SEPOLIA_RPC_URL=YOUR_SERVER_SIDE_SEPOLIA_RPC
APP_DATA_ENCRYPTION_KEY=YOUR_32_BYTE_BASE64_KEY
APP_ORIGIN=https://YOUR-PROJECT.vercel.app
SIWE_DOMAIN=YOUR-PROJECT.vercel.app
COOKIE_SECURE=true
DATABASE_PATH=/app/.data/pramaan-app.sqlite
PORT=4000
```

`APP_ORIGIN` includes `https://`. `SIWE_DOMAIN` is only the hostname and must
not include a scheme, path, or trailing slash.

Deploy and test:

```text
https://pramaan-chain-smart-contracts-1.onrender.com/api/health
```

The service root returning `404` is expected. Its implemented routes begin
with `/api`.

## 6. Frontend on Vercel

Import the GitHub repository into Vercel and configure:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `__frontend` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | `22.x` |

Add these variables to the **Production** environment:

```dotenv
VITE_APP_API_URL=/app-api/api
VITE_BLOCKCHAIN_API_URL=/chain-api/api
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
VITE_ETHERSCAN_BASE_URL=https://sepolia.etherscan.io
VITE_PUBLIC_APP_URL=https://YOUR-PROJECT.vercel.app
VITE_WALLETCONNECT_PROJECT_ID=
```

Use the exact production domain shown in Vercel without a trailing slash.
`VITE_WALLETCONNECT_PROJECT_ID` is optional when the demo uses browser-extension
wallets only. Every `VITE_*` value is public browser configuration; never place
an RPC credential, private key, database encryption key, or backend secret in
one.

## 7. Vercel API proxy

The checked-in [`__frontend/vercel.json`](../__frontend/vercel.json) exposes
both backends under the frontend origin:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/app-api/:path*",
      "destination": "https://pramaan-chain-smart-contracts-1.onrender.com/:path*"
    },
    {
      "source": "/chain-api/:path*",
      "destination": "https://pramaan-chain-smart-contracts.onrender.com/:path*"
    },
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

The application-backend rewrite keeps SIWE API requests and session cookies
under the Vercel origin. The final rewrite supports direct navigation to React
routes. After changing Vercel environment variables, redeploy so Vite embeds
the new public configuration.

## 8. Cross-service origin settings

After Vercel assigns the production URL, make these values identical:

| Service | Variable | Value |
| --- | --- | --- |
| Vercel | `VITE_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` |
| Gateway | `CORS_ALLOWED_ORIGINS` | `https://YOUR-PROJECT.vercel.app` |
| Application backend | `APP_ORIGIN` | `https://YOUR-PROJECT.vercel.app` |
| Application backend | `SIWE_DOMAIN` | `YOUR-PROJECT.vercel.app` |
| Application backend | `COOKIE_SECURE` | `true` |

Redeploy both Render services after changing their variables. Vercel preview
domains differ from the production origin and are not automatically authorized
for SIWE. Validate protected flows on the production URL.

## 9. Deployment verification

Open the direct Render health endpoints first to wake both free services. Then
check the same services through Vercel:

```text
https://YOUR-PROJECT.vercel.app/app-api/api/health
https://YOUR-PROJECT.vercel.app/chain-api/api/health
```

The frontend also sends these two health requests in the background whenever a
new page load starts. This wakes sleeping Render instances without blocking
the initial React render. The first API action can still fail or time out until
both free services finish their cold start.

Validate, without sending a Sepolia transaction:

1. The frontend loads at `/`.
2. Direct navigation to `/verify` loads the React application.
3. Public verification can read an existing synthetic certificate hash.
4. Wallet sign-in completes through SIWE.
5. Refreshing the page preserves the session while the backend instance and
   SQLite database remain available.
6. No server RPC credential or encryption key appears in browser assets,
   responses, or logs.

Authorization, issuance, and revocation are public state changes. Do not use
them merely to test hosting. They require a separate explicit decision and
wallet confirmation.

## 10. Free-tier behavior

This hosting demonstrates availability but does not provide production
durability:

- Render can sleep a free web service after inactivity, causing a cold start.
- A restart or redeploy can erase SQLite sessions, institutions, relationships,
  requests, assignments, and the generated gateway state.
- The gateway rebuilds its in-memory certificate index after restarting.
- Two services share the Render workspace's free instance-hour allowance.
- Vercel remains available while a sleeping Render backend wakes, so the first
  API request can temporarily fail or time out.

Before a demonstration, open both direct Render health URLs and wait for valid
responses. Sign in again if the application database was recreated.

## 11. Troubleshooting

### RPC responds `chain is not available on free plan`

The configured provider does not offer Sepolia for that account or endpoint.
Replace `SEPOLIA_RPC_URL` in both Render services with a server-side Sepolia
endpoint that reports chain ID `11155111`. No contract deployment is needed.

### Gateway health returns `BLOCKCHAIN_UNAVAILABLE`

Confirm the RPC URL, chain, provider quota, and deployed contract bytecode.
Also check whether background historical indexing is exhausting RPC throughput.
The application backend being healthy does not prove the gateway provider is
healthy under its indexing workload.

### Certificate or event lists return `503`

The RPC cannot supply historical `eth_getLogs` from the deployment block, or
the gateway is still rebuilding. Direct `/verify/:documentHash` calls remain a
separate path and can still work.

### Browser reports CORS or origin errors

Use the exact Vercel production origin in `CORS_ALLOWED_ORIGINS` and
`APP_ORIGIN`. Match the scheme and hostname, and remove trailing slashes.

### SIWE succeeds but the session disappears

Confirm that the frontend uses `/app-api/api`, `COOKIE_SECURE=true`, and the
Vercel rewrite. A Render restart also erases the free-tier SQLite session.

### A credentialed RPC URL appears in a log

Rotate the provider key immediately and replace the Render secret. Never paste
credentialed RPC URLs into issues, documentation, Vercel variables, or shared
deployment output.

## 12. Platform references

- [Render Docker services](https://render.com/docs/docker)
- [Render environment variables and secret files](https://render.com/docs/configure-environment-variables)
- [Render free-service limitations](https://render.com/docs/free)
- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites)
