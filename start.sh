#!/bin/bash

# Start SSH service
echo "Starting SSH service..."
sudo service ssh start

# Start the FastAPI backend in the background
echo "Starting FastAPI backend on port 8000..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start the Next.js frontend in the background
echo "Starting Next.js frontend on port 3000..."
cd /app/frontend
node server.js &
FRONTEND_PID=$!

# Wait for any process to exit
# If either the backend or frontend crashes, the container should exit.
wait -n

# Exit with the status of the process that exited first
exit $?
