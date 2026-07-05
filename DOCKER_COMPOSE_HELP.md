# Docker Compose Command Help

## The `docker-compose: command not found` Issue

Modern Docker (v20.10+) includes Compose as a plugin, so the command is `docker compose` (with a space) instead of the old standalone `docker-compose` (with a hyphen).

## Quick Fix

**Use the management script** - it automatically detects which version you have:

```bash
./manage.sh start
./manage.sh logs
./manage.sh status
```

## Manual Command Reference

If you need to run Docker Compose commands manually:

### Check which version you have:

```bash
# Try new version (plugin)
docker compose version

# Try old version (standalone)
docker-compose --version
```

### Use the correct command:

**For Docker with Compose plugin (recommended):**
```bash
docker compose up -d
docker compose down
docker compose logs -f
docker compose ps
```

**For standalone docker-compose:**
```bash
docker-compose up -d
docker-compose down
docker-compose logs -f
docker-compose ps
```

## Installing Docker Compose

### Option 1: Install Docker Desktop (Easiest)
Docker Desktop includes the Compose plugin automatically.
- [Download for Mac](https://docs.docker.com/desktop/install/mac-install/)
- [Download for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)

### Option 2: Install Compose Plugin (Linux)

For Ubuntu/Debian:
```bash
# Update package list
sudo apt-get update

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin

# Verify installation
docker compose version
```

For other distributions, see: https://docs.docker.com/compose/install/

### Option 3: Install Standalone docker-compose (Legacy)

```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

## Recommendation

**Use the `./manage.sh` script** for all operations. It automatically detects and uses the correct command, so you don't have to worry about which version is installed.

## Common Commands Mapping

| Task | With manage.sh | With docker compose | With docker-compose |
|------|----------------|---------------------|---------------------|
| Start services | `./manage.sh start` | `docker compose up -d` | `docker-compose up -d` |
| Stop services | `./manage.sh stop` | `docker compose down` | `docker-compose down` |
| View logs | `./manage.sh logs` | `docker compose logs -f` | `docker-compose logs -f` |
| Check status | `./manage.sh status` | `docker compose ps` | `docker-compose ps` |
| Restart | `./manage.sh restart` | `docker compose restart` | `docker-compose restart` |
| Update | `./manage.sh update` | `docker compose pull && docker compose up -d --build` | `docker-compose pull && docker-compose up -d --build` |

## Still Having Issues?

1. **Check Docker is installed:**
   ```bash
   docker --version
   ```

2. **Check Docker is running:**
   ```bash
   docker ps
   ```

3. **Check permissions:**
   ```bash
   # Add your user to docker group (Linux)
   sudo usermod -aG docker $USER
   # Then log out and back in
   ```

4. **Verify compose file exists:**
   ```bash
   ls -la docker-compose.yml
   ```

5. **Check for typos:**
   - It's `docker compose` (space) not `docker-compose` (hyphen) for the new version
   - File name is still `docker-compose.yml` (with hyphen) for both versions
