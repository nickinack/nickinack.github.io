#!/bin/bash
# ─────────────────────────────────────────────
#  Start Karthik's website on http://localhost:8000
# ─────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8000

echo ""
echo "  ██████╗  ██╗  ██╗"
echo "  ██╔══██╗ ██║  ██║"
echo "  ██████╔╝ ███████║"
echo "  ██╔══██╗ ╚════██║"
echo "  ██║  ██║      ██║"
echo "  ╚═╝  ╚═╝      ╚═╝"
echo ""
echo "  Karthik Viswanathan — Personal Website"
echo "  ----------------------------------------"
echo "  URL: http://localhost:$PORT"
echo "  Dir: $DIR"
echo "  Stop: Ctrl+C"
echo ""

cd "$DIR"

# Try to open the browser
if command -v open &>/dev/null; then
  sleep 0.5 && open "http://localhost:$PORT" &
elif command -v xdg-open &>/dev/null; then
  sleep 0.5 && xdg-open "http://localhost:$PORT" &
fi

# Serve with Python 3
if command -v python3 &>/dev/null; then
  python3 -m http.server $PORT
elif command -v python &>/dev/null; then
  python -m SimpleHTTPServer $PORT
else
  echo "  Error: Python not found. Install Python 3 to use this script."
  exit 1
fi
