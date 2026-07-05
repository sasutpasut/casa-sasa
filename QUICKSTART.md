# Casa Sasa - Quick Start Guide

Get Casa Sasa running in 5 minutes!

## Prerequisites

- Docker (with Compose plugin) installed
- Port 80 and 3000 available

**Note:** Modern Docker includes Compose as a plugin (`docker compose`). If you have the old standalone version, use `docker-compose` instead.

## Installation Steps

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example backend/.env

# IMPORTANT: Edit passwords!
nano backend/.env
```

**Change these values:**
```bash
JWT_SECRET=your_very_long_random_secret_here
ADMIN_PASSWORD=your_secure_admin_password
GUEST_PASSWORD=your_secure_guest_password
```

### 2. Start the Application

```bash
# Make management script executable
chmod +x manage.sh

# Start all services (recommended)
./manage.sh start

# Or manually with docker compose
docker compose up -d

# Or with older docker-compose
docker-compose up -d
```

### 3. Access the Website

Open your browser:
- **Website**: http://localhost (or http://your-server-ip)
- **Login**: Click the "Login" button in the top right
  - Use your `ADMIN_PASSWORD` for full access
  - Use your `GUEST_PASSWORD` for read-only access

## Common Management Tasks

```bash
# View logs
./manage.sh logs

# Check status
./manage.sh status

# Create backup
./manage.sh backup

# Stop services
./manage.sh stop

# Restart services
./manage.sh restart
```

## Content Management (Admin Only)

Once logged in as admin, you can:

### Add/Edit Trips
1. Go to "Trips & Tips" page
2. Click "+ Add New Trip"
3. Fill in the form (name, distance, elevation, etc.)
4. Upload up to 10 photos
5. Click "Add Trip"

To edit: Click the ✏️ button on any trip card

### Manage Bucket List
1. Scroll to "Bucket List" section
2. Click "+ Add Item"
3. Enter name, description, and optional URL
4. Click "Save Item"

To edit: Click "Edit" next to any item

### Upload Gallery Photos
1. Go to "Gallery" page
2. Use the upload form at the bottom
3. Select image and click "Upload Photo"

## Updating Content

All content is managed through the web interface - no code changes needed!

- **Trips**: Add, edit, delete through the web UI
- **Bucket List**: Add, edit, delete through the web UI
- **Gallery**: Upload, delete photos through the web UI
- **Passwords**: Use `./manage.sh reset-password`
- **Static Text**: Edit `src/language.js` and restart: `./manage.sh restart`

## Troubleshooting

### Can't access the website?

```bash
# Check if services are running
./manage.sh status

# View logs for errors
./manage.sh logs
```

### Forgot admin password?

```bash
# Reset password
./manage.sh reset-password
```

### Need to restore from backup?

```bash
# Restore from backup
./manage.sh restore
```

## Production Deployment

For production servers:

1. **Setup HTTPS** - Use nginx or Caddy reverse proxy
2. **Strong passwords** - Use 20+ character random passwords
3. **Regular backups** - Schedule daily backups with cron
4. **Firewall** - Only expose ports 80, 443
5. **Updates** - Run `./manage.sh update` monthly

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production setup.

## Need Help?

1. Check logs: `./manage.sh logs`
2. Check status: `./manage.sh status`
3. Read full deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
4. Open database to inspect data: `./manage.sh db`

## File Structure

```
casa-sasa/
├── backend/          # Backend server code
│   ├── server.js     # Main server file
│   ├── .env          # Configuration (passwords, secrets)
│   ├── trips.db      # SQLite database
│   └── uploads/      # Uploaded photos
├── src/              # Frontend source code
│   ├── language.js   # Translations (CZ/EN)
│   └── *.js          # Other frontend code
├── *.html            # HTML pages
├── manage.sh         # Management script
└── docker-compose.yml # Docker configuration
```

## Default Credentials

**Change these immediately in `backend/.env`!**

- Admin password: `admin123`
- Guest password: `guest123`
- JWT Secret: `super_secret_random_string_change_this_in_production`

---

**That's it! You're ready to use Casa Sasa.**

For advanced configuration and production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).
