const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// 1. INITIALIZE EXPRESS APP FIRST (Fixes the crash)
const app = express();
const PORT = process.env.PORT || 3000;

// 2. APPLY CORE MIDDLEWARES
// Allow requests from localhost and local network IPs
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return allowed === origin;
            } else {
                return allowed.test(origin);
            }
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Initialize SQLite database
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'trips.db');
const db = new sqlite3.Database(dbPath, err => {
    if (err) {
        console.error('Failed to connect to database:', err);
    } else console.log('Connected to SQLite database at', dbPath);
});

// Create trips table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        length REAL NOT NULL,
        elevation REAL,
        difficulty TEXT,
        description TEXT,
        photos TEXT,
        author TEXT,
        map_url TEXT,
        start_from_moggio INTEGER DEFAULT 1,
        drive_time INTEGER DEFAULT 0,
        trip_type TEXT DEFAULT 'hike',
        rating_sum INTEGER DEFAULT 0,
        rating_count INTEGER DEFAULT 0
        )
    `);

    // Add new columns if they don't exist (for existing databases)
    db.run(`ALTER TABLE trips ADD COLUMN start_from_moggio INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE trips ADD COLUMN drive_time INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE trips ADD COLUMN trip_type TEXT DEFAULT 'hike'`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE trips ADD COLUMN rating_sum INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE trips ADD COLUMN rating_count INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error(err);
    });

    // Create ratings table for device-based ratings
    db.run(`
        CREATE TABLE IF NOT EXISTS trip_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(trip_id, device_id),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
        )
    `);

    // Create bucket list table
    db.run(`
        CREATE TABLE IF NOT EXISTS bucket_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Authentication middleware
const authenticateToken = (requiredRole) => {
    return (req, res, next) => {
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ error: 'Access denied.' });
        }

        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.user = verified;

            if (requiredRole && req.user.role !== requiredRole) {
                return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
            }

            next();
        } catch (err) {
            return res.status(400).json({ error: 'Invalid token.' });
        }
    };
};

// Authentication endpoint with rate limiting
app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;

    // Basic input validation
    if (!password || typeof password !== 'string' || password.length > 200) {
        // Add delay for invalid input to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 3000));
        return res.status(401).json({ error: 'Invalid password.' });
    }

    let role = null;

    if (password === process.env.ADMIN_PASSWORD) role = 'admin';
    else if (password === process.env.GUEST_PASSWORD) role = 'guest';

    if (!role) {
        // Add 3-second delay on failed login to prevent brute force
        await new Promise(resolve => setTimeout(resolve, 3000));
        return res.status(401).json({ error: 'Invalid password.' });
    }

    const token = jwt.sign({ role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', success: true, role });
});

// Current auth status (Fixed duplicate response issue)
app.get('/api/auth/status', (req, res) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.json({ loggedIn: false, role: null });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, loggedIn: true, role: verified.role });
    } catch (err) {
        res.json({ loggedIn: false, role: null });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logout successful' });
});

// Admin-only endpoint - delete a trip
app.delete('/api/trips/:id', authenticateToken('admin'), (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM trips WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Trip deleted successfully' });
    });
});

// Serve static files from the 'uploads' directory
const uploadsPath = path.resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Upload a new image
app.post('/api/upload', authenticateToken(), upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', filename: `${req.file.filename}` });
});

// Get all uploaded images
app.get('/api/images', (req, res) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if(!fs.existsSync(uploadPath)) {
        return res.json([]);
    }

    fs.readdir(uploadPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read uploads directory' });
        }

        const validImages = files.filter(file => file !== '.gitkeep');
        const imageUrls = validImages.map(file => `http://localhost:3000/uploads/${file}`);
        res.json(imageUrls);
    });
});

// Delete an image (admin only)
app.delete('/api/images/:filename', authenticateToken('admin'), (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ message: 'File deleted successfully' });
    });
});

// Get all trips
app.get('/api/trips', (req, res) => {
    db.all('SELECT * FROM trips ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const processedRows = rows.map(row => ({
            ...row,
            photos: row.photos ? JSON.parse(row.photos) : [],
            average_rating: row.rating_count > 0 ? (row.rating_sum / row.rating_count).toFixed(1) : 0
        }));

        res.json(processedRows);
    });
});

// Rate a trip
app.post('/api/trips/:id/rate', (req, res) => {
    const { id } = req.params;
    const { rating, device_id } = req.body;

    // Validate trip ID
    const tripId = parseInt(id);
    if (isNaN(tripId) || tripId < 1) {
        return res.status(400).json({ error: 'Invalid trip ID' });
    }

    // Validate rating
    const ratingValue = parseInt(rating);
    if (!rating || isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate device ID
    if (!device_id || typeof device_id !== 'string' || device_id.length > 100) {
        return res.status(400).json({ error: 'Invalid device ID' });
    }

    // Check if device has already rated this trip
    db.get('SELECT rating FROM trip_ratings WHERE trip_id = ? AND device_id = ?', [tripId, device_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
            // Update existing rating
            const oldRating = row.rating;
            const ratingDiff = ratingValue - oldRating;

            db.run('UPDATE trip_ratings SET rating = ? WHERE trip_id = ? AND device_id = ?', [ratingValue, tripId, device_id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update rating' });
                }

                // Update trip rating sum
                db.run('UPDATE trips SET rating_sum = rating_sum + ? WHERE id = ?', [ratingDiff, tripId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to update rating sum' });
                    }

                    res.json({ message: 'Rating updated successfully' });
                });
            });
        } else {
            // Insert new rating
            db.run('INSERT INTO trip_ratings (trip_id, device_id, rating) VALUES (?, ?, ?)', [tripId, device_id, ratingValue], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to add rating' });
                }

                // Update trip rating sum and count
                db.run('UPDATE trips SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?', [ratingValue, tripId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to update trip stats' });
                    }

                    res.json({ message: 'Rating added successfully' });
                });
            });
        }
    });
});

// Get user's rating for a trip
app.get('/api/trips/:id/my-rating', (req, res) => {
    const { id } = req.params;
    const { device_id } = req.query;

    if (!device_id) {
        return res.status(400).json({ error: 'Device ID required' });
    }

    db.get('SELECT rating FROM trip_ratings WHERE trip_id = ? AND device_id = ?', [id, device_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ rating: row ? row.rating : null });
    });
});

// Add a new trip
app.post('/api/trips', authenticateToken(), upload.array('photos', 10), (req, res) => {
    console.log('POST /api/trips - Request received');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 0);

    const { name, length, elevation, difficulty, description, author, map_url, start_from_moggio, drive_time, trip_type } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.length > 200) {
        console.error('Validation failed: Invalid trip name');
        return res.status(400).json({ error: 'Invalid trip name' });
    }
    if (!length || isNaN(parseFloat(length))) {
        console.error('Validation failed: Invalid length:', length);
        return res.status(400).json({ error: 'Invalid length' });
    }
    if (!elevation || isNaN(parseInt(elevation))) {
        console.error('Validation failed: Invalid elevation:', elevation);
        return res.status(400).json({ error: 'Invalid elevation' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        console.error('Validation failed: Invalid difficulty:', difficulty);
        return res.status(400).json({ error: 'Invalid difficulty' });
    }
    if (!['hike', 'city', 'ascent', 'bike', 'attraction'].includes(trip_type)) {
        console.error('Validation failed: Invalid trip type:', trip_type);
        return res.status(400).json({ error: 'Invalid trip type' });
    }
    if (description && description.length > 5000) {
        console.error('Validation failed: Description too long');
        return res.status(400).json({ error: 'Description too long' });
    }

    const photoFilenames = req.files ? req.files.map(file => file.filename) : [];
    const photosJson = JSON.stringify(photoFilenames);

    console.log('Validation passed. Inserting trip into database...');

    const query = `
        INSERT INTO trips (name, length, elevation, difficulty, description, photos, author, map_url, start_from_moggio, drive_time, trip_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    db.run(query, [
        name,
        parseFloat(length),
        parseInt(elevation),
        difficulty,
        description || '',
        photosJson,
        author || 'Anonymous',
        map_url || '',
        start_from_moggio === 'true' || start_from_moggio === true ? 1 : 0,
        parseInt(drive_time) || 0,
        trip_type
    ], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to add trip', details: err.message });
        }
        console.log('Trip added successfully! ID:', this.lastID);
        res.json({ message: 'Trip added successfully', tripId: this.lastID });
    });
});

// UPDATE trip endpoint (admin only)
app.put('/api/trips/:id', authenticateToken(), upload.array('photos', 10), (req, res) => {
    const tripId = req.params.id;
    const { name, length, elevation, difficulty, description, author, map_url, start_from_moggio, drive_time, trip_type } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.length > 200) {
        return res.status(400).json({ error: 'Invalid trip name' });
    }
    if (!length || isNaN(parseFloat(length))) {
        return res.status(400).json({ error: 'Invalid length' });
    }
    if (!elevation || isNaN(parseInt(elevation))) {
        return res.status(400).json({ error: 'Invalid elevation' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
    }
    if (!['hike', 'city', 'ascent', 'bike', 'attraction'].includes(trip_type)) {
        return res.status(400).json({ error: 'Invalid trip type' });
    }
    if (description && description.length > 5000) {
        return res.status(400).json({ error: 'Description too long' });
    }

    // If new photos are uploaded, add them to existing photos
    let updatePhotosQuery = '';
    let photoUpdateParams = [];

    if (req.files && req.files.length > 0) {
        // Get existing photos first
        db.get('SELECT photos FROM trips WHERE id = ?', [tripId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to retrieve trip' });
            }
            if (!row) {
                return res.status(404).json({ error: 'Trip not found' });
            }

            const existingPhotos = row.photos ? JSON.parse(row.photos) : [];
            const newPhotoFilenames = req.files.map(file => file.filename);
            const allPhotos = [...existingPhotos, ...newPhotoFilenames].slice(0, 10); // Max 10 photos
            const photosJson = JSON.stringify(allPhotos);

            const query = `
                UPDATE trips
                SET name = ?, length = ?, elevation = ?, difficulty = ?, description = ?,
                    author = ?, map_url = ?, start_from_moggio = ?, drive_time = ?, trip_type = ?, photos = ?
                WHERE id = ?
            `;

            db.run(query, [
                name,
                parseFloat(length),
                parseInt(elevation),
                difficulty,
                description || '',
                author || 'Anonymous',
                map_url || '',
                start_from_moggio === 'true' || start_from_moggio === true ? 1 : 0,
                parseInt(drive_time) || 0,
                trip_type,
                photosJson,
                tripId
            ], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update trip' });
                }
                res.json({ message: 'Trip updated successfully' });
            });
        });
    } else {
        // No new photos, just update other fields
        const query = `
            UPDATE trips
            SET name = ?, length = ?, elevation = ?, difficulty = ?, description = ?,
                author = ?, map_url = ?, start_from_moggio = ?, drive_time = ?, trip_type = ?
            WHERE id = ?
        `;

        db.run(query, [
            name,
            parseFloat(length),
            parseInt(elevation),
            difficulty,
            description || '',
            author || 'Anonymous',
            map_url || '',
            start_from_moggio === 'true' || start_from_moggio === true ? 1 : 0,
            parseInt(drive_time) || 0,
            trip_type,
            tripId
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update trip' });
            }
            res.json({ message: 'Trip updated successfully' });
        });
    }
});

// ========== BUCKET LIST ENDPOINTS ==========

// GET all bucket list items (public)
app.get('/api/bucket-list', (req, res) => {
    db.all('SELECT * FROM bucket_list ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve bucket list items' });
        }
        res.json(rows);
    });
});

// POST new bucket list item (admin only)
app.post('/api/bucket-list', authenticateToken('admin'), (req, res) => {
    const { name, description, url } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.length > 200) {
        return res.status(400).json({ error: 'Invalid item name' });
    }
    if (!description || typeof description !== 'string' || description.length > 1000) {
        return res.status(400).json({ error: 'Invalid description' });
    }
    if (url && (typeof url !== 'string' || url.length > 500)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const query = `
        INSERT INTO bucket_list (name, description, url)
        VALUES (?, ?, ?)
    `;

    db.run(query, [name, description, url || null], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add bucket list item' });
        }
        res.json({ message: 'Item added successfully', itemId: this.lastID });
    });
});

// PUT update bucket list item (admin only)
app.put('/api/bucket-list/:id', authenticateToken('admin'), (req, res) => {
    const itemId = req.params.id;
    const { name, description, url } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.length > 200) {
        return res.status(400).json({ error: 'Invalid item name' });
    }
    if (!description || typeof description !== 'string' || description.length > 1000) {
        return res.status(400).json({ error: 'Invalid description' });
    }
    if (url && (typeof url !== 'string' || url.length > 500)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const query = `
        UPDATE bucket_list
        SET name = ?, description = ?, url = ?
        WHERE id = ?
    `;

    db.run(query, [name, description, url || null, itemId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update bucket list item' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item updated successfully' });
    });
});

// DELETE bucket list item (admin only)
app.delete('/api/bucket-list/:id', authenticateToken('admin'), (req, res) => {
    const itemId = req.params.id;

    db.run('DELETE FROM bucket_list WHERE id = ?', [itemId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete bucket list item' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    // Check database connection
    db.get('SELECT 1', [], (err) => {
        if (err) {
            return res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: err.message
            });
        }
        res.json({
            status: 'healthy',
            database: 'connected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});