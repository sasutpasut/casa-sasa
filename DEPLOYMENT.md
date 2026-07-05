# Casa Sasa - Deployment Guide

This guide covers deploying Casa Sasa in a Docker container on a remote server.

## Quick Start

1. **Clone the repository** on your server
2. **Copy environment template**: `cp .env.example backend/.env`
3. **Edit credentials**: Update passwords and secrets in `backend/.env`
4. **Start the application**: `./manage.sh start` (or `docker compose up -d`)
5. **Access the website**: Navigate to `http://your-server-ip`

## Environment Configuration

### Required Environment Variables

Edit `backend/.env` with your production values:

```bash
# Security - MUST CHANGE IN PRODUCTION
JWT_SECRET=your_very_long_random_secret_string_here
ADMIN_PASSWORD=your_secure_admin_password
GUEST_PASSWORD=your_secure_guest_password

# Optional - defaults shown
PORT=3000
DB_PATH=./trips.db
UPLOADS_DIR=./uploads
```

### Generating a Secure JWT Secret

```bash
# Linux/Mac
openssl rand -base64 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Docker Deployment

### Starting the Application

**Using the management script (recommended):**
```bash
./manage.sh start
./manage.sh logs
./manage.sh stop
```

**Or manually with Docker Compose:**
```bash
# Start all services in background
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Note:** The `manage.sh` script automatically detects whether you have `docker compose` (new) or `docker-compose` (old standalone).

### Data Persistence

The following data is persisted in Docker volumes:

- **Database**: All trips, ratings, and bucket list items
- **Uploads**: Photos from gallery and trip uploads

To backup your data:

```bash
# Using management script (recommended)
./manage.sh backup

# Or manually:
# Backup database
docker compose exec backend cp /app/trips.db /app/data/trips.db.backup

# Copy from container to host
docker cp $(docker compose ps -q backend):/app/trips.db ./backup-trips.db

# Backup uploads
docker cp $(docker compose ps -q backend):/app/uploads ./backup-uploads
```

### Updating the Application

```bash
# Using management script (recommended - includes backup)
./manage.sh update

# Or manually:
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Or without downtime
docker compose up -d --build --no-deps frontend
docker compose up -d --build --no-deps backend
```

## Accessing the Admin Panel

1. Navigate to the website
2. Log in with your `ADMIN_PASSWORD`
3. Admin features become visible:
   - Add/Edit/Delete trips
   - Add/Edit/Delete bucket list items
   - Delete gallery photos
   - View all uploaded content

## Managing Content Without Code Changes

### 1. Trips Management
- **Add trips**: Click "+ Add New Trip" button (admin only)
- **Edit trips**: Click ✏️ Edit button on any trip card (admin only)
- **Delete trips**: Click 🗑️ Delete button on any trip card (admin only)
- All changes are immediate and stored in the database

### 2. Bucket List Management
- **Add items**: Click "+ Add Item" in Bucket List section (admin only)
- **Edit items**: Click "Edit" next to any item (admin only)
- **Delete items**: Click "Delete" next to any item (admin only)

### 3. Gallery Management
- **Upload photos**: Use upload form on Gallery page (admin only)
- **Delete photos**: Photos can be deleted by admin (feature enabled)

### 4. Password Changes

To change passwords without editing code:

```bash
# Using management script (recommended)
./manage.sh reset-password

# Or manually:
# Stop the container
docker compose stop backend

# Edit the .env file
nano backend/.env
# Update ADMIN_PASSWORD and/or GUEST_PASSWORD

# Restart the container
docker compose start backend
```

### 5. Language Content

Static content (instructions, tips, etc.) is in `src/language.js`:
- Edit translations for Czech/English content
- Restart frontend container: `./manage.sh restart` or `docker compose restart frontend`

## Production Best Practices

### 1. Use HTTPS (Reverse Proxy)

Use nginx or Caddy as a reverse proxy with SSL:

**Example nginx configuration:**

```nginx
server {
    listen 443 ssl http2;
    server_name casasasa.example.com;

    ssl_certificate /etc/ssl/certs/casasasa.crt;
    ssl_certificate_key /etc/ssl/private/casasasa.key;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Regular Backups

Set up a cron job for automatic backups:

```bash
# Add to crontab (crontab -e)
0 2 * * * docker exec casa-sasa-backend-1 cp /app/trips.db /app/data/backup-$(date +\%Y\%m\%d).db
0 2 * * 0 tar -czf /backups/uploads-$(date +\%Y\%m\%d).tar.gz -C /var/lib/docker/volumes/casa-sasa_casa-sasa-uploads/_data .
```

### 3. Monitor Resources

```bash
# Using management script
./manage.sh status
./manage.sh logs

# Or manually:
# View resource usage
docker stats

# View logs
docker compose logs -f --tail=100

# Check health
docker compose ps
```

### 4. Security Checklist

- ✅ Strong JWT_SECRET (64+ random characters)
- ✅ Strong ADMIN_PASSWORD and GUEST_PASSWORD
- ✅ HTTPS enabled with valid SSL certificate
- ✅ Firewall configured (only ports 80, 443 open)
- ✅ Regular security updates: `./manage.sh update` or `docker compose pull && docker compose up -d`
- ✅ Database backups automated
- ✅ File upload limits enforced (max 10 photos per trip)

## Troubleshooting

### Container won't start

```bash
# Check logs
./manage.sh logs
# Or: docker compose logs backend

# Common issues:
# - Port 3000 already in use: Change BACKEND_PORT in .env
# - Missing .env file: Copy from .env.example
```

### Cannot login

```bash
# Verify password in .env
docker compose exec backend cat .env | grep PASSWORD

# Check JWT_SECRET is set
docker compose exec backend cat .env | grep JWT_SECRET
```

### Database issues

```bash
# Access database directly
./manage.sh db
# Or manually:
docker compose exec backend sh
cd /app
sqlite3 trips.db

# View tables
.tables

# Check data
SELECT * FROM trips;
SELECT * FROM bucket_list;
```

### Photos not uploading

```bash
# Check uploads directory permissions
docker compose exec backend ls -la /app/uploads

# Check disk space
df -h

# View upload errors in logs
./manage.sh logs | grep -i upload
# Or: docker compose logs backend | grep -i upload
```

## Advanced Configuration

### Custom Ports

Create a `.env` file in the root directory:

```bash
FRONTEND_PORT=8080
BACKEND_PORT=8000
```

Then run: `./manage.sh start` or `docker compose up -d`

### Database Migration

To move database from old deployment:

```bash
# Stop current container
docker compose stop backend

# Copy new database
docker cp ./old-trips.db $(docker compose ps -q backend):/app/trips.db

# Start container
docker compose start backend
```

## Support

For issues or questions:
1. Check logs: `./manage.sh logs`
2. Review this guide
3. Check GitHub issues (if applicable)

## Maintenance Schedule

Recommended maintenance tasks:

- **Daily**: Monitor logs for errors
- **Weekly**: Check disk space and container health
- **Monthly**: Update Docker images and review backups
- **Quarterly**: Review and update passwords
- **Yearly**: SSL certificate renewal (if not automated)
