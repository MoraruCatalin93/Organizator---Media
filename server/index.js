// Patch for Node.js 24+ compatibility with older Tensorflow versions
const util = require('util');
if (typeof util.isNullOrUndefined !== 'function') {
    util.isNullOrUndefined = (val) => val === undefined || val === null;
}

// Patch tfjs-node dependency since it fails to install on Node 24
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === '@tensorflow/tfjs-node') {
        try {
            return originalRequire.call(this, id);
        } catch (e) {
            return originalRequire.call(this, '@tensorflow/tfjs');
        }
    }
    return originalRequire.apply(this, arguments);
};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const personRoutes = require('./routes/personRoutes');
const processRoutes = require('./routes/processRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const jobRoutes = require('./routes/jobRoutes');
const config = require('./config');
const { loadModels } = require('./services/faceService');
const { runMigration } = require('./services/migrationService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security headers (relaxed for multipart + cross-origin API)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS driven by env (comma-separated origins allowed)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic rate limiting — protects the (expensive) AI endpoints from abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,                 // max 200 requests / IP / window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Prea multe cereri. Încearcă din nou mai târziu.' }
});
app.use('/api/', limiter);

// Cap JSON body size (protects against oversized payloads)
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/persons', personRoutes);
app.use('/api/process', processRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/jobs', jobRoutes);

// Serve organized images (local provider) — efficient streaming
app.use('/media', express.static(config.outputDir));

// Serve reference images
const path = require('path');
app.use('/references', express.static(path.join(__dirname, 'data/references')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler — returns clean JSON for multer/validation errors
app.use((err, _req, res, _next) => {
    if (err && err.name === 'MulterError') {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? `Fișier prea mare (max ${process.env.MAX_UPLOAD_MB || 25} MB).`
            : err.message;
        return res.status(400).json({ error: msg });
    }
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origine nepermisă (CORS).' });
    }
    console.error('[Unhandled error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Eroare de server.' });
});

const server = app.listen(PORT, async () => {
    console.log(`\x1b[32m%s\x1b[0m`, `[Server] Running on http://localhost:${PORT}`);
    try {
        runMigration();
        await loadModels();
        console.log(`\x1b[32m%s\x1b[0m`, `[Server] Face-api models loaded. Ready to process!`);
    } catch (e) {
        console.error("\x1b[31m%s\x1b[0m", `[Server] Failed to load models during startup:`, e);
    }
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error("\x1b[31m%s\x1b[0m", `[Error] Port ${PORT} is already in use. Please kill the process or change the port.`);
    } else {
        console.error("\x1b[31m%s\x1b[0m", `[Error] Server error:`, e);
    }
});

