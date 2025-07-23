#!/bin/bash
set -e
echo "Starting PostgreSQL container for timetracker-mcp..."
docker compose up -d postgres
echo "PostgreSQL container started successfully."
echo "Connection: postgres://timetracker-mcp:timetracker-mcp@localhost:5432/timetracker-mcp"

# Display information for .env file
echo ""
echo "=================================================="
echo "Add the following to your .env file:"
echo "=================================================="
echo "DATABASE_URL=postgresql://timetracker-mcp:timetracker-mcp@localhost:5432/timetracker-mcp"
echo "=================================================="
echo ""
