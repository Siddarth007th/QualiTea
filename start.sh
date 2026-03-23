#!/bin/bash

# QualiTea Quick Start Script
echo "Installing/starting QualiTea Backend..."
cd server
npm install
node index.js &
SERVER_PID=$!
cd ..

echo "Installing/starting QualiTea Frontend..."
cd client
npm install
npm run dev &
CLIENT_PID=$!
cd ..

echo "--------------------------------------------------------"
echo "✅ QualiTea is running!"
echo "Backend API: http://localhost:5001"
echo "Frontend UI: http://localhost:5173"
echo "--------------------------------------------------------"
echo "Press Ctrl+C to stop both servers."

# Handle Ctrl+C to stop both processes
trap 'echo "Stopping servers..."; kill $SERVER_PID $CLIENT_PID; exit' SIGINT

wait $SERVER_PID $CLIENT_PID
