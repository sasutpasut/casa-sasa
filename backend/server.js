const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const e = require('express');

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
        photos TEXT
        )
    `,);
});

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
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
app.post('/api/upload', upload.single('image'), (req, file) => {
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
        const imageUrls = files.map(file => `http://localhost:3000/uploads/${file}`);
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
app.post('/api/trips', upload.array('photos', 10), (req, res) => {
    const { name, length, elevation, difficulty, description  } = req.body;
    
    console.log("--- MULTER RECEIVED FILES ---");
    console.log(req.files); 
    console.log("-----------------------------");

    const photoFilenames = req.files ? req.files.map(file => file.filename) : [];
    const photosJson = JSON.stringify(photoFilenames);

    const query = `
        INSERT INTO trips (name, length, elevation, difficulty, description, photos)
        VALUES (?, ?, ?, ?, ?, ?)
        `;

    db.run(query, [name, length, elevation, difficulty, description, photosJson], function(err) {
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