# Casa Sasa - Data Storage Guide

## Where Trips Are Stored

When you submit a new trip form, the data is saved in **two locations**:

### 1. Trip Metadata → SQLite Database

**Location:** `/backend/trips.db`

**What's stored:**
- Trip name, author, description
- Length, elevation, difficulty
- Trip type (hike, city, ascent, bike, attraction)
- Start location (from Moggio or need car)
- Drive time
- Map URL
- Photo filenames (as JSON array)
- Rating data (average rating, rating count)

**Database structure:**
```sql
CREATE TABLE trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    length REAL NOT NULL,
    elevation REAL,
    difficulty TEXT,
    description TEXT,
    photos TEXT,              -- JSON array of photo filenames
    author TEXT,
    map_url TEXT,
    start_from_moggio INTEGER DEFAULT 1,
    drive_time INTEGER DEFAULT 0,
    trip_type TEXT DEFAULT 'hike',
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0
)
```

**Current data:**
```bash
# Check your current trips
cd /home/amertl/Projects/casa-sasa/backend
sqlite3 trips.db "SELECT id, name, author, trip_type FROM trips;"

# Output shows you have 2 trips:
# ID 3: "vylet" by lucei (type: hike)
# ID 5: "Long desc AND photo" by lucei (type: hike)
```

### 2. Trip Photos → File System

**Location:** `/backend/uploads/`

**What's stored:**
- All uploaded photos (from trips, gallery)
- Filenames are timestamped: `{timestamp}-{original-filename}.{ext}`
- Maximum 10 photos per trip

**Current uploads:**
```
/backend/uploads/
├── 1111111111111111111111111111111moggio.jpg (685 KB)
├── 11111111111111111111111111111church.jpg (571 KB)
├── 1780314708990-images.jpeg (5.2 KB)
└── 1780319473485-454-4545253_clipart-sun-creepy-creepy-sun-with-face-hd.png (446 KB)
```

---

## Complete Data Storage Map

```
casa-sasa/
├── backend/
│   ├── trips.db                 # SQLite database
│   │   ├── trips table          # Trip metadata
│   │   ├── trip_ratings table   # User ratings (device-based)
│   │   └── bucket_list table    # Bucket list items
│   │
│   └── uploads/                 # Uploaded files
│       ├── {timestamp}-photo1.jpg
│       ├── {timestamp}-photo2.jpg
│       └── ...
```

---

## How Data Flows When You Submit a Trip

### Step 1: Frontend (Form Submission)
**File:** `src/trips-logic.js`

```javascript
form.onsubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('trip-name').value);
    formData.append('map_url', document.getElementById('trip-map-url').value);
    // ... other fields ...
    
    // Add photos
    const fileInput = document.getElementById('trip-photos');
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('photos', fileInput.files[i]);
    }
    
    // Send to backend
    await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
    });
}
```

### Step 2: Backend (API Endpoint)
**File:** `backend/server.js`

```javascript
app.post('/api/trips', authenticateToken(), upload.array('photos', 10), (req, res) => {
    // 1. Extract form data
    const { name, length, elevation, difficulty, description, ... } = req.body;
    
    // 2. Save photos to /uploads/ (handled by multer)
    const photoFilenames = req.files.map(file => file.filename);
    const photosJson = JSON.stringify(photoFilenames);
    
    // 3. Insert into database
    db.run(`
        INSERT INTO trips (name, length, elevation, difficulty, description, photos, ...)
        VALUES (?, ?, ?, ?, ?, ?, ...)
    `, [name, length, elevation, difficulty, description, photosJson, ...]);
});
```

### Step 3: Storage
- **Metadata** → Written to `backend/trips.db`
- **Photos** → Saved to `backend/uploads/{timestamp}-{filename}.{ext}`

### Step 4: Retrieval
When you view trips:

```javascript
// Frontend fetches trips
const trips = await fetch(`${API_URL}/api/trips`).then(r => r.json());

// Backend returns all trips from database
app.get('/api/trips', (req, res) => {
    db.all('SELECT * FROM trips', [], (err, rows) => {
        // Parse photos JSON and add average rating
        rows.forEach(row => {
            row.photos = JSON.parse(row.photos || '[]');
            row.average_rating = row.rating_count > 0 
                ? row.rating_sum / row.rating_count 
                : 0;
        });
        res.json(rows);
    });
});

// Frontend displays photos using photo URLs
const photoUrl = `${API_URL}/uploads/${photoFilename}`;
```

---

## Other Data Tables

### trip_ratings Table
**Purpose:** Store user ratings (one rating per device per trip)

```sql
CREATE TABLE trip_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, device_id)
)
```

**How it works:**
- Device ID is generated from browser localStorage
- Each device can only rate each trip once
- Ratings are aggregated into `trips.rating_sum` and `trips.rating_count`

### bucket_list Table
**Purpose:** Store bucket list items (admin-editable)

```sql
CREATE TABLE bucket_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## Accessing Your Data

### View Database Contents

```bash
# Access database CLI
cd /home/amertl/Projects/casa-sasa/backend
sqlite3 trips.db

# List all trips
SELECT * FROM trips;

# List all bucket list items
SELECT * FROM bucket_list;

# List all ratings
SELECT * FROM trip_ratings;

# Exit
.exit
```

### Or use the management script:

```bash
# Open database CLI
./manage.sh db

# Then run SQL queries
SELECT id, name, author, trip_type FROM trips;
```

---

## Backup Your Data

### Manual Backup

```bash
# Backup database
cp backend/trips.db backend/trips.db.backup

# Backup uploads
cp -r backend/uploads backend/uploads.backup
```

### Using Management Script

```bash
# Create timestamped backup of database + uploads
./manage.sh backup

# Backups saved to: ./backups/{timestamp}.tar.gz
```

---

## Docker Data Persistence

When running in Docker, data is stored in **Docker volumes**:

```yaml
volumes:
  casa-sasa-data:      # For trips.db
  casa-sasa-uploads:   # For uploaded photos
```

**Location on host:**
```bash
# Find volume location
docker volume inspect casa-sasa_casa-sasa-data
docker volume inspect casa-sasa_casa-sasa-uploads

# Typical location:
/var/lib/docker/volumes/casa-sasa_casa-sasa-data/_data/trips.db
/var/lib/docker/volumes/casa-sasa_casa-sasa-uploads/_data/
```

**Backup Docker volumes:**
```bash
# Using management script (recommended)
./manage.sh backup

# Or manually
docker cp $(docker compose ps -q backend):/app/trips.db ./trips.db.backup
docker cp $(docker compose ps -q backend):/app/uploads ./uploads.backup
```

---

## Summary

**When you submit a trip form:**

1. ✅ Trip data (name, description, stats) → `backend/trips.db` (SQLite database)
2. ✅ Trip photos (images) → `backend/uploads/` (file system)
3. ✅ Photo filenames are stored as JSON array in database
4. ✅ Photos are served via: `http://localhost:3000/uploads/{filename}`

**Current status:**
- Database: `backend/trips.db` (24 KB, 2 trips, SQLite 3.x)
- Uploads: `backend/uploads/` (4 photos, 1.7 MB total)
- Tables: trips, trip_ratings, bucket_list
