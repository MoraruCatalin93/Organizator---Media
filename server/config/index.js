// Centralized, validated configuration. Loads .env on first require.
require('dotenv').config();
const path = require('path');

const config = {
    port: parseInt(process.env.PORT || '5001', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowedScanRoot: (process.env.ALLOWED_SCAN_ROOT || '').trim(),
    faceMatchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.55'),
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
    // Where organized output is written (local provider root)
    outputDir: path.join(__dirname, '..', 'output'),
    // Active storage backend: 'local' | 'drive' | 's3' (drive/s3 added later)
    storageTarget: (process.env.STORAGE_TARGET || 'local').toLowerCase(),
    isProd: process.env.NODE_ENV === 'production',
};

module.exports = config;
