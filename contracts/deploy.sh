#!/usr/bin/env bash
# Deploy (o dry-run) de BlindBidVault a Arbitrum Sepolia.
#   bash deploy.sh            # dry-run (simula, no envía tx)
#   bash deploy.sh --broadcast  # envía la transacción real
set -euo pipefail
cd "$(dirname "$0")"
set -a
source .env
set +a

forge script script/DeployBlindBidVault.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  "$@"
