#!/bin/sh
set -eu

runtime_file="${DEPLOYMENT_RUNTIME_PATH:-/run/pramaan/runtime.env}"
if [ ! -r "$runtime_file" ]; then
  echo "Deployment runtime is missing or unreadable: $runtime_file" >&2
  exit 1
fi

while IFS='=' read -r name value; do
  case "$name" in
    BLOCKCHAIN_CHAIN_ID|PRAMAAN_CHAIN_ADDRESS|PRAMAAN_CHAIN_START_BLOCK|ADMINISTRATOR_ADDRESS|ISSUER_ADDRESS)
      export "$name=$value"
      ;;
    ""|\#*)
      ;;
    *)
      echo "Unexpected deployment runtime variable: $name" >&2
      exit 1
      ;;
  esac
done < "$runtime_file"

: "${PRAMAAN_CHAIN_ADDRESS:?PRAMAAN_CHAIN_ADDRESS is required}"
: "${BLOCKCHAIN_CHAIN_ID:?BLOCKCHAIN_CHAIN_ID is required}"

export VITE_APP_API_URL="${VITE_APP_API_URL:-http://localhost:4000/api}"
export VITE_BLOCKCHAIN_API_URL="${VITE_BLOCKCHAIN_API_URL:-http://localhost:3000/api}"
export VITE_ETHERSCAN_BASE_URL="${VITE_ETHERSCAN_BASE_URL:-https://sepolia.etherscan.io}"
export VITE_PUBLIC_APP_URL="${VITE_PUBLIC_APP_URL:-http://localhost:5173}"
export VITE_WALLETCONNECT_PROJECT_ID="${VITE_WALLETCONNECT_PROJECT_ID:-}"

envsubst \
  '${PRAMAAN_CHAIN_ADDRESS} ${BLOCKCHAIN_CHAIN_ID} ${VITE_APP_API_URL} ${VITE_BLOCKCHAIN_API_URL} ${VITE_ETHERSCAN_BASE_URL} ${VITE_PUBLIC_APP_URL} ${VITE_WALLETCONNECT_PROJECT_ID}' \
  < /opt/pramaan/runtime-config.template.js \
  > /tmp/runtime-config.js

exec nginx -g 'daemon off;'
