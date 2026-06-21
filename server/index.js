// Patch for Node.js 24+ compatibility with older Tensorflow versions
const util = require('util');
if (typeof util.isNullOrUndefined !== 'function') {
    util.isNullOrUndefined = (val) => val === undefined || val === null;
}

const express = require('express');
const cors = require('cors');
const personRoutes = require('./routes/personRoutes');
const processRoutes = require('./routes/processRoutes');
const { loadModels } = require('./services/faceService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/persons', personRoutes);
app.use('/api/process', processRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const server = app.listen(PORT, async () => {
    console.log(`\x1b[32m%s\x1b[0m`, `[Server] Running on http://localhost:${PORT}`);
    try {
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

// Keep-alive to prevent unexpected exits if event loop empties
setInterval(() => {}, 1000 * 60 * 60); 

