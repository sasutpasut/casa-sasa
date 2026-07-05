#!/bin/bash

# Casa Sasa Management Script
# Simplifies common deployment and maintenance tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_help() {
    cat << EOF
Casa Sasa Management Script

Usage: ./manage.sh [command]

Commands:
    start           Start all services
    stop            Stop all services
    restart         Restart all services
    logs            View logs (ctrl+c to exit)
    status          Check status of all services
    backup          Create backup of database and uploads
    restore         Restore from backup (interactive)
    update          Pull latest changes and restart
    reset-password  Reset admin/guest password (interactive)
    shell           Open shell in backend container
    db              Open database CLI
    clean           Remove stopped containers and unused volumes
    help            Show this help message

Examples:
    ./manage.sh start
    ./manage.sh logs
    ./manage.sh backup
EOF
}

function start_services() {
    echo -e "${GREEN}Starting Casa Sasa services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}Services started successfully!${NC}"
    echo "Access the website at: http://localhost"
}

function stop_services() {
    echo -e "${YELLOW}Stopping Casa Sasa services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped successfully!${NC}"
}

function restart_services() {
    echo -e "${YELLOW}Restarting Casa Sasa services...${NC}"
    docker-compose restart
    echo -e "${GREEN}Services restarted successfully!${NC}"
}

function view_logs() {
    echo -e "${GREEN}Viewing logs (press Ctrl+C to exit)...${NC}"
    docker-compose logs -f --tail=100
}

function check_status() {
    echo -e "${GREEN}Checking service status...${NC}"
    docker-compose ps
    echo ""
    echo -e "${GREEN}Resource usage:${NC}"
    docker stats --no-stream $(docker-compose ps -q)
}

function backup_data() {
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    echo -e "${GREEN}Creating backup in $BACKUP_DIR...${NC}"

    # Backup database
    docker-compose exec -T backend cat /app/trips.db > "$BACKUP_DIR/trips.db"

    # Backup uploads
    CONTAINER_ID=$(docker-compose ps -q backend)
    docker cp "$CONTAINER_ID:/app/uploads" "$BACKUP_DIR/uploads"

    # Backup .env file
    cp backend/.env "$BACKUP_DIR/.env"

    # Create archive
    tar -czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" .
    rm -rf "$BACKUP_DIR"

    echo -e "${GREEN}Backup created: $BACKUP_DIR.tar.gz${NC}"
}

function restore_data() {
    echo -e "${YELLOW}Available backups:${NC}"
    ls -1 backups/*.tar.gz 2>/dev/null || echo "No backups found"

    read -p "Enter backup file path: " BACKUP_FILE

    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Backup file not found!${NC}"
        exit 1
    fi

    read -p "This will overwrite current data. Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi

    TEMP_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose stop backend

    # Restore database
    CONTAINER_ID=$(docker-compose ps -q backend)
    docker cp "$TEMP_DIR/trips.db" "$CONTAINER_ID:/app/trips.db"

    # Restore uploads
    docker cp "$TEMP_DIR/uploads/." "$CONTAINER_ID:/app/uploads/"

    echo -e "${YELLOW}Starting services...${NC}"
    docker-compose start backend

    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}Restore completed successfully!${NC}"
}

function update_app() {
    echo -e "${YELLOW}Updating Casa Sasa...${NC}"

    # Create backup first
    echo -e "${GREEN}Creating backup before update...${NC}"
    backup_data

    # Pull latest changes
    git pull origin main

    # Rebuild and restart
    docker-compose down
    docker-compose up -d --build

    echo -e "${GREEN}Update completed successfully!${NC}"
}

function reset_password() {
    echo -e "${YELLOW}Password Reset${NC}"
    echo "1. Admin Password"
    echo "2. Guest Password"
    read -p "Which password to reset? (1/2): " CHOICE

    if [ "$CHOICE" == "1" ]; then
        read -sp "Enter new admin password: " NEW_PASSWORD
        echo ""
        sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$NEW_PASSWORD/" backend/.env
        echo -e "${GREEN}Admin password updated!${NC}"
    elif [ "$CHOICE" == "2" ]; then
        read -sp "Enter new guest password: " NEW_PASSWORD
        echo ""
        sed -i "s/GUEST_PASSWORD=.*/GUEST_PASSWORD=$NEW_PASSWORD/" backend/.env
        echo -e "${GREEN}Guest password updated!${NC}"
    else
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Restarting backend...${NC}"
    docker-compose restart backend
    echo -e "${GREEN}Password reset complete!${NC}"
}

function open_shell() {
    echo -e "${GREEN}Opening shell in backend container...${NC}"
    docker-compose exec backend sh
}

function open_db() {
    echo -e "${GREEN}Opening database CLI...${NC}"
    echo "Type .exit to close"
    docker-compose exec backend sqlite3 /app/trips.db
}

function clean_docker() {
    echo -e "${YELLOW}Cleaning Docker resources...${NC}"
    docker-compose down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}Cleanup completed!${NC}"
}

# Main command router
case "${1:-help}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    backup)
        backup_data
        ;;
    restore)
        restore_data
        ;;
    update)
        update_app
        ;;
    reset-password)
        reset_password
        ;;
    shell)
        open_shell
        ;;
    db)
        open_db
        ;;
    clean)
        clean_docker
        ;;
    help|--help|-h)
        print_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_help
        exit 1
        ;;
esac
