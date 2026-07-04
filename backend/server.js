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
app.use(cors({
    origin: 'http://localhost:5173', // Must exactly match your frontend port
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173', // Your Vite frontend URL
    credentials: true                // CRITICAL: Allows cookies to pass through CORS
}));

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
        map_url TEXT
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

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    let role = null;

    console.log("=== AUTH DEBUG ===");
    console.log("Received via body:", JSON.stringify(password));
    console.log("Expected Admin:", JSON.stringify(process.env.ADMIN_PASSWORD));
    console.log("Expected Guest:", JSON.stringify(process.env.GUEST_PASSWORD));
    console.log("==================");

    if (password === process.env.ADMIN_PASSWORD) role = 'admin';
    if (password === process.env.GUEST_PASSWORD) role = 'guest';

    if (!role) {
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

// Get all trips
app.get('/api/trips', (req, res) => {
    db.all('SELECT * FROM trips ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const processedRows = rows.map(row => ({
            ...row,
            photos: row.photos ? JSON.parse(row.photos) : []
        }));

        res.json(processedRows);
    });
});

// Add a new trip
app.post('/api/trips', authenticateToken(), upload.array('photos', 10), (req, res) => {
    const { name, length, elevation, difficulty, description, author, map_url } = req.body;

    const photoFilenames = req.files ? req.files.map(file => file.filename) : [];
    const photosJson = JSON.stringify(photoFilenames);

    const query = `
        INSERT INTO trips (name, length, elevation, difficulty, description, photos, author, map_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

    db.run(query, [name, length, elevation, difficulty, description, photosJson, author, map_url], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Trip added successfully', tripId: this.lastID });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});