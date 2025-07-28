#!/bin/bash

echo "========================================"
echo "   ResuPrompt Services Startup"
echo "========================================"
echo

echo "Finding your IP address..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

echo "Your IP Address: $IP"
echo

echo "Starting all services with network access..."
echo
echo "Frontend will be available at: http://$IP:5173"
echo "Backend will be available at: http://$IP:3001"
echo "Document Service will be available at: http://$IP:8080"
echo

# Set absolute paths to each service directory
FRONTEND_DIR="$(pwd)/frontend"
BACKEND_DIR="$(pwd)/backend"
DOCSERVICE_DIR="$(pwd)/doc-service"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for different terminal emulators
if command_exists "gnome-terminal"; then
    echo "Using GNOME Terminal with tabs in single window..."
    
    # Start all services in one window with multiple tabs
    gnome-terminal --title="ResuPrompt Services" \
        --tab --title="Document Service" -- bash -c "cd $DOCSERVICE_DIR && gradle bootRun; exec bash" \
        --tab --title="Backend" -- bash -c "cd $BACKEND_DIR && npm start; exec bash" \
        --tab --title="Frontend" -- bash -c "cd $FRONTEND_DIR && npm run dev; exec bash" \
        --tab --title="Base Script" -- bash -c "echo 'Base Script - All services started successfully!' && echo && echo 'Health Check URLs:' && echo '- Document Service: http://$IP:8080/health' && echo '- Backend: http://$IP:3001/api/health' && echo '- Frontend: http://$IP:5173' && echo && echo 'Press Ctrl+C to exit...' && while true; do sleep 1; done"
    
elif command_exists "konsole"; then
    echo "Using KDE Konsole with tabs in single window..."
    
    # Start all services in one konsole window with tabs
    konsole --title "ResuPrompt Services" \
        --new-tab -e bash -c "cd $DOCSERVICE_DIR && gradle bootRun; exec bash" \
        --new-tab -e bash -c "cd $BACKEND_DIR && npm start; exec bash" \
        --new-tab -e bash -c "cd $FRONTEND_DIR && npm run dev; exec bash" \
        --new-tab -e bash -c "echo 'Base Script - All services started successfully!' && echo && echo 'Health Check URLs:' && echo '- Document Service: http://$IP:8080/health' && echo '- Backend: http://$IP:3001/api/health' && echo '- Frontend: http://$IP:5173' && echo && echo 'Press Ctrl+C to exit...' && while true; do sleep 1; done"
    
elif command_exists "xfce4-terminal"; then
    echo "Using XFCE Terminal with tabs in single window..."
    
    # Start all services in one window with multiple tabs
    xfce4-terminal --title="ResuPrompt Services" \
        --tab --title="Document Service" --command="bash -c 'cd $DOCSERVICE_DIR && gradle bootRun; exec bash'" \
        --tab --title="Backend" --command="bash -c 'cd $BACKEND_DIR && npm start; exec bash'" \
        --tab --title="Frontend" --command="bash -c 'cd $FRONTEND_DIR && npm run dev; exec bash'" \
        --tab --title="Base Script" --command="bash -c 'echo \"Base Script - All services started successfully!\" && echo && echo \"Health Check URLs:\" && echo \"- Document Service: http://$IP:8080/health\" && echo \"- Backend: http://$IP:3001/api/health\" && echo \"- Frontend: http://$IP:5173\" && echo && echo \"Press Ctrl+C to exit...\" && while true; do sleep 1; done'"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Using macOS Terminal with separate windows..."
    
    # macOS Terminal doesn't support tabs via command line, so we'll use separate windows
    osascript <<EOF
tell application "Terminal"
    -- Document Service
    do script "cd $DOCSERVICE_DIR && gradle bootRun"
    set custom title of front window to "Document Service"
    
    -- Backend
    do script "cd $BACKEND_DIR && npm start"
    set custom title of front window to "Backend"
    
    -- Frontend
    do script "cd $FRONTEND_DIR && npm run dev"
    set custom title of front window to "Frontend"
    
    -- Base Script
    do script "echo 'Base Script - All services started successfully!' && echo && echo 'Health Check URLs:' && echo '- Document Service: http://$IP:8080/health' && echo '- Backend: http://$IP:3001/api/health' && echo '- Frontend: http://$IP:5173' && echo && echo 'Press Ctrl+C to exit...' && while true; do sleep 1; done"
    set custom title of front window to "Base Script"
end tell
EOF
    
else
    echo "No supported terminal found, using background processes..."
    echo "You can check the processes manually or use 'jobs' command"
    
    # Start document service in background
    echo "Starting Document Service..."
    cd $DOCSERVICE_DIR && gradle bootRun &
    DOC_SERVICE_PID=$!
    
    # Wait for document service to start
    sleep 5
    
    # Start backend in background
    echo "Starting Backend..."
    cd $BACKEND_DIR && npm start &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    echo "Starting Frontend..."
    cd $FRONTEND_DIR && npm run dev
    
    # Cleanup on exit
    trap "kill $BACKEND_PID $DOC_SERVICE_PID 2>/dev/null" EXIT
fi

echo
echo "All services started! Check the terminal tabs/windows."
echo
echo "Health check URLs:"
echo "- Document Service: http://$IP:8080/health"
echo "- Backend: http://$IP:3001/api/health"
echo "- Frontend: http://$IP:5173"
echo 