#!/usr/bin/env bash
set -euo pipefail

FE_PID=""
BE_PID=""

cleanup() {
  if [ -n "$FE_PID" ]; then kill "$FE_PID" 2>/dev/null || true; fi
  if [ -n "$BE_PID" ]; then kill "$BE_PID" 2>/dev/null || true; fi
  wait "$FE_PID" "$BE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "🚀 InvoiceShield — Frontend en http://localhost:3000 | Backend en http://localhost:4000"
echo "Press Ctrl+C para detener ambos."

npm run dev --prefix frontend &
FE_PID=$!

npm run start:dev --prefix backend &
BE_PID=$!

wait "$FE_PID" "$BE_PID"
