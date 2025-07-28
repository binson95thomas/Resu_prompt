#!/bin/bash

echo "========================================"
echo "    Stopping ResuPrompt Services"
echo "========================================"
echo

# Check if PID file exists
PID_FILE="/tmp/resuprompt_pids.txt"
if [[ -f "$PID_FILE" ]]; then
    echo "Found PID file. Stopping specific processes..."
    while IFS= read -r pid; do
        if [[ -n "$pid" ]]; then
            echo "Stopping process PID: $pid"
            kill -TERM "$pid" 2>/dev/null
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    echo "PID file deleted."
else
    echo "No PID file found. Stopping all related processes..."
fi

# Kill any remaining processes related to our services
echo
echo "Stopping any remaining Node.js processes..."
if pkill -f "npm start" 2>/dev/null; then
    echo "[✓] Backend processes stopped"
else
    echo "[✗] No Backend processes found"
fi

if pkill -f "npm run dev" 2>/dev/null; then
    echo "[✓] Frontend processes stopped"
else
    echo "[✗] No Frontend processes found"
fi

echo "Stopping any remaining Java processes..."
if pkill -f "gradle bootRun" 2>/dev/null; then
    echo "[✓] Document Service processes stopped"
else
    echo "[✗] No Document Service processes found"
fi

echo
echo "========================================"
echo "    Cleanup"
echo "========================================"
echo

# Clean up log files
echo "Cleaning up log files..."
rm -f /tmp/doc-service.log
rm -f /tmp/backend.log
rm -f /tmp/frontend.log

echo
echo "All services stopped and cleaned up!"
echo 