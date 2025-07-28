#!/bin/bash

echo "========================================"
echo "   ResuPrompt Background Services"
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

echo "Starting all services as background processes..."
echo

# Set absolute paths to each service directory
FRONTEND_DIR="$(pwd)/frontend"
BACKEND_DIR="$(pwd)/backend"
DOCSERVICE_DIR="$(pwd)/doc-service"

# Create a temporary file to store PIDs
PID_FILE="/tmp/resuprompt_pids.txt"
echo "" > "$PID_FILE"

# Function to cleanup on exit
cleanup() {
    echo
    echo "Stopping all services..."
    if [[ -f "$PID_FILE" ]]; then
        while IFS= read -r pid; do
            if [[ -n "$pid" ]]; then
                echo "Stopping process PID: $pid"
                kill -TERM "$pid" 2>/dev/null
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining processes
    pkill -f "gradle bootRun" 2>/dev/null
    pkill -f "npm start" 2>/dev/null
    pkill -f "npm run dev" 2>/dev/null
    
    echo "All services stopped!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "[1/4] Starting Document Service..."
cd "$DOCSERVICE_DIR"
gradle bootRun > /tmp/doc-service.log 2>&1 &
DOC_PID=$!
echo "$DOC_PID" >> "$PID_FILE"
echo "Document Service PID: $DOC_PID"

echo "[2/4] Starting Backend..."
cd "$BACKEND_DIR"
npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >> "$PID_FILE"
echo "Backend PID: $BACKEND_PID"

echo "[3/4] Starting Frontend..."
cd "$FRONTEND_DIR"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"
echo "Frontend PID: $FRONTEND_PID"

echo "[4/4] All services started!"
echo

echo "========================================"
echo "    Service Status"
echo "========================================"
echo "Document Service: http://$IP:8080/health"
echo "Backend: http://$IP:3001/api/health"
echo "Frontend: http://$IP:5173"
echo
echo "Log files:"
echo "- Document Service: /tmp/doc-service.log"
echo "- Backend: /tmp/backend.log"
echo "- Frontend: /tmp/frontend.log"
echo
echo "PIDs saved to: $PID_FILE"
echo

# Function to show menu
show_menu() {
    echo "========================================"
    echo "    Control Menu"
    echo "========================================"
    echo "1. View all logs (real-time)"
    echo "2. View specific service log"
    echo "3. Stop all services"
    echo "4. Check service status"
    echo "5. Exit (keep services running)"
    echo
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1) view_all_logs ;;
        2) view_specific_log ;;
        3) stop_all_services ;;
        4) check_status ;;
        5) exit_keep_running ;;
        *) echo "Invalid choice. Please try again." && show_menu ;;
    esac
}

# Function to view all logs
view_all_logs() {
    echo
    echo "========================================"
    echo "    Real-time Logs (Press Ctrl+C to stop)"
    echo "========================================"
    echo
    tail -f /tmp/doc-service.log /tmp/backend.log /tmp/frontend.log
    show_menu
}

# Function to view specific log
view_specific_log() {
    echo
    echo "Which service log do you want to view?"
    echo "1. Document Service"
    echo "2. Backend"
    echo "3. Frontend"
    echo "4. Back to main menu"
    echo
    read -p "Enter choice (1-4): " log_choice
    
    case $log_choice in
        1)
            echo
            echo "========================================"
            echo "    Document Service Log"
            echo "========================================"
            cat /tmp/doc-service.log
            read -p "Press Enter to continue..."
            ;;
        2)
            echo
            echo "========================================"
            echo "    Backend Log"
            echo "========================================"
            cat /tmp/backend.log
            read -p "Press Enter to continue..."
            ;;
        3)
            echo
            echo "========================================"
            echo "    Frontend Log"
            echo "========================================"
            cat /tmp/frontend.log
            read -p "Press Enter to continue..."
            ;;
        4) show_menu ;;
        *) echo "Invalid choice." && read -p "Press Enter to continue..." ;;
    esac
    show_menu
}

# Function to stop all services
stop_all_services() {
    echo
    echo "========================================"
    echo "    Stopping All Services"
    echo "========================================"
    echo
    
    cleanup
}

# Function to check status
check_status() {
    echo
    echo "========================================"
    echo "    Service Status Check"
    echo "========================================"
    echo
    
    # Check if processes are running
    echo "Checking Document Service (Java)..."
    if pgrep -f "gradle bootRun" > /dev/null; then
        echo "[✓] Document Service is running"
    else
        echo "[✗] Document Service is not running"
    fi
    
    echo "Checking Backend (Node.js)..."
    if pgrep -f "npm start" > /dev/null; then
        echo "[✓] Backend is running"
    else
        echo "[✗] Backend is not running"
    fi
    
    echo "Checking Frontend (Node.js)..."
    if pgrep -f "npm run dev" > /dev/null; then
        echo "[✓] Frontend is running"
    else
        echo "[✗] Frontend is not running"
    fi
    
    echo
    echo "Health Check URLs:"
    echo "- Document Service: http://$IP:8080/health"
    echo "- Backend: http://$IP:3001/api/health"
    echo "- Frontend: http://$IP:5173"
    echo
    read -p "Press Enter to continue..."
    show_menu
}

# Function to exit keeping services running
exit_keep_running() {
    echo
    echo "========================================"
    echo "    Services will continue running"
    echo "========================================"
    echo
    echo "To stop all services later, run:"
    echo "./stop-services.sh"
    echo
    echo "Or manually kill the processes using:"
    echo "pkill -f 'gradle bootRun'"
    echo "pkill -f 'npm start'"
    echo "pkill -f 'npm run dev'"
    echo
    echo "Services are running at:"
    echo "- Document Service: http://$IP:8080/health"
    echo "- Backend: http://$IP:3001/api/health"
    echo "- Frontend: http://$IP:5173"
    echo
    read -p "Press Enter to exit..."
    exit 0
}

# Start the menu
show_menu 