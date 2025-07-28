#!/bin/bash

echo "========================================"
echo "   ResuPrompt Network Access Setup"
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

echo "Starting all services in separate terminal tabs..."
echo
echo "Frontend will be available at: http://$IP:5173"
echo "Backend will be available at: http://$IP:3001"
echo "Document Service will be available at: http://$IP:8080"
echo
echo "Each service will run in its own terminal tab"
echo

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for different terminal emulators
if command_exists "gnome-terminal"; then
    echo "Using GNOME Terminal with tabs in single window..."
    
    # Set absolute paths to each service directory
    FRONTEND_DIR="$(pwd)/frontend"
    BACKEND_DIR="$(pwd)/backend"
    DOCSERVICE_DIR="$(pwd)/doc-service"
    
    # Start all services in one window with multiple tabs
    gnome-terminal --title="ResuPrompt Services" \
        --tab --title="Document Service" -- bash -c "cd $DOCSERVICE_DIR && ./gradlew bootRun; exec bash" \
        --tab --title="Backend" -- bash -c "cd $BACKEND_DIR && npm start; exec bash" \
        --tab --title="Frontend" -- bash -c "cd $FRONTEND_DIR && npm run dev; exec bash"
    
elif command_exists "konsole"; then
    echo "Using KDE Konsole with tabs in single window..."
    
    # Set absolute paths to each service directory
    FRONTEND_DIR="$(pwd)/frontend"
    BACKEND_DIR="$(pwd)/backend"
    DOCSERVICE_DIR="$(pwd)/doc-service"
    
    # Start all services in one konsole window with tabs
    konsole --title "ResuPrompt Services" \
        --new-tab -e bash -c "cd $DOCSERVICE_DIR && ./gradlew bootRun; exec bash" \
        --new-tab -e bash -c "cd $BACKEND_DIR && npm start; exec bash" \
        --new-tab -e bash -c "cd $FRONTEND_DIR && npm run dev; exec bash"
    
elif command_exists "xfce4-terminal"; then
    echo "Using XFCE Terminal with tabs in single window..."
    
    # Set absolute paths to each service directory
    FRONTEND_DIR="$(pwd)/frontend"
    BACKEND_DIR="$(pwd)/backend"
    DOCSERVICE_DIR="$(pwd)/doc-service"
    
    # Start all services in one window with multiple tabs
    xfce4-terminal --title="ResuPrompt Services" \
        --tab --title="Document Service" --command="bash -c 'cd $DOCSERVICE_DIR && ./gradlew bootRun; exec bash'" \
        --tab --title="Backend" --command="bash -c 'cd $BACKEND_DIR && npm start; exec bash'" \
        --tab --title="Frontend" --command="bash -c 'cd $FRONTEND_DIR && npm run dev; exec bash'"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Using macOS Terminal with tabs..."
    
    # macOS Terminal doesn't support tabs via command line, so we'll use separate windows
    osascript <<EOF
tell application "Terminal"
    -- Document Service
    do script "cd $(pwd)/doc-service && ./gradlew bootRun"
    set custom title of front window to "Document Service"
    
    -- Backend
    do script "cd $(pwd)/backend && npm start"
    set custom title of front window to "Backend"
    
    -- Frontend
    do script "cd $(pwd)/frontend && npm run dev"
    set custom title of front window to "Frontend"
end tell
EOF
    
else
    echo "No supported terminal found, using background processes..."
    echo "You can check the processes manually or use 'jobs' command"
    
    # Start document service in background
    echo "Starting Document Service..."
    cd doc-service && ./gradlew bootRun &
    DOC_SERVICE_PID=$!
    
    # Wait for document service to start
    sleep 5
    
    # Start backend in background
    echo "Starting Backend..."
    cd ../backend && npm start &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    echo "Starting Frontend..."
    cd ../frontend && npm run dev
    
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