const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const { getStorageProvider } = require('../storage');
const { withJpgExt } = require('../services/imageService');
const { processImageFile, copyImageToFolders, getDatabase } = require('../services/storageService');
const { hasHash, getFileHash, addHashes, removeHashes } = require('../services/hashService');
const { hasCredentials, isAuthenticated, getAuthUrl, getAccessToken } = require('../services/driveService');

const router = express.Router();

const MAX_UPLOAD_MB = config.maxUploadMb;
const ALLOWED_IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i;

// Multer: size limit + file count + image-only filter
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 50 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_RE.test(file.originalname)) return cb(null, true);
        cb(new Error(`Tip de fișier neacceptat: ${file.originalname}`));
    }
});

/**
 * Resolve and validate a user-supplied folder path so the server can only
 * read inside ALLOWED_SCAN_ROOT (prevents path traversal / arbitrary file access).
 */
function resolveSafePath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') {
        throw new Error('Cale invalidă.');
    }
    const root = process.env.ALLOWED_SCAN_ROOT;
    if (!root) {
        throw new Error('Scanarea folderelor locale este dezactivată. Setează ALLOWED_SCAN_ROOT pe server.');
    }
    const resolved = path.resolve(rawPath);
    const rootResolved = path.resolve(root);
    // Reject any attempt to escape the allowed root via ".." or absolute paths outside it
    const rel = path.relative(rootResolved, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error('Acces refuzat: calea este în afara zonei permise.');
    }
    return resolved;
}

router.post('/local', async (req, res) => {
    const { folderPath, previewOnly } = req.body;
    if (!folderPath) {
        return res.status(400).json({ error: 'Folder path is required' });
    }

    try {
        const safePath = resolveSafePath(folderPath);

        if (!fs.existsSync(safePath)) {
            return res.status(400).json({ error: 'Folder does not exist' });
        }

        const { createJob, runLocalJob } = require('../services/jobManager');
        const jobId = createJob('local', { folderPath, previewOnly, safePath });
        
        // Start job in background
        runLocalJob(jobId).catch(err => console.error('Background local job failed:', err));

        res.json({ success: true, jobId });
    } catch (error) {
        console.error('Error starting local job:', error);
        const status = error.message.includes('permisă') || error.message.includes('dezactivată') ? 403 : 500;
        res.status(status).json({ error: error.message });
    }
});

router.post('/upload', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const previewOnly = req.body.previewOnly === 'true' || req.body.previewOnly === true;
        
        const { createJob, runUploadJob } = require('../services/jobManager');
        const jobId = createJob('upload', { files: req.files, previewOnly });
        
        // Start job in background
        runUploadJob(jobId).catch(err => console.error('Background upload job failed:', err));

        res.json({ success: true, jobId });
    } catch (error) {
        console.error('Error starting upload job:', error);
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path).catch(()=>{});
            }
        }
        res.status(500).json({ error: error.message });
    }
});

router.post('/commit', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Items required' });
        }

        const provider = getStorageProvider(config.storageTarget);
        
        // Group items by sourcePath to avoid reading the same file multiple times
        const itemsByPath = {};
        for (const item of items) {
            if (!itemsByPath[item.sourcePath]) {
                itemsByPath[item.sourcePath] = {
                    storeName: item.storeName,
                    isTempUpload: item.isTempUpload,
                    hash: item.hash,
                    matched: new Set()
                };
            }
            itemsByPath[item.sourcePath].matched.add(item.detectedPerson);
            
            if (item.descriptor) {
                const isUnknown = item.detectedPerson.startsWith('Necunoscut');
                const { addPersonDescriptor } = require('../repositories/personRepository');
                addPersonDescriptor(item.detectedPerson, item.descriptor, isUnknown);
            }
        }

        let processed = 0;
        const filesMoved = [];
        for (const [sourcePath, data] of Object.entries(itemsByPath)) {
            if (!fs.existsSync(sourcePath)) {
                console.warn(`File not found for commit: ${sourcePath}`);
                continue;
            }
            const raw = await fs.readFile(sourcePath);
            const { prepareImage } = require('../services/imageService');
            let storeBuffer = raw;
            try {
                const prepared = await prepareImage(raw);
                storeBuffer = prepared.storeBuffer;
            } catch(e) {}
            
            await copyImageToFolders(storeBuffer, Array.from(data.matched), data.storeName, provider);
            
            for (const folderName of data.matched) {
                const dest = path.join(folderName, data.storeName);
                filesMoved.push({ source: sourcePath, destination: dest, hash: data.hash });
            }

            if (data.isTempUpload) {
                await fs.remove(sourcePath).catch(()=>{});
            }
            processed += data.matched.size;
        }

        const hashesToCommit = filesMoved.map(f => f.hash).filter(Boolean);
        if (hashesToCommit.length > 0) {
            addHashes(hashesToCommit);
        }

        const { recordTransaction } = require('../services/transactionService');
        if (filesMoved.length > 0) {
            recordTransaction(filesMoved);
        }

        res.json({ success: true, processed });
    } catch (error) {
        console.error('Error in commit:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/cancel', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Items required' });
        }
        let removed = 0;
        for (const item of items) {
            // Only remove temporary uploads
            if (item.isTempUpload && item.sourcePath && fs.existsSync(item.sourcePath)) {
                await fs.remove(item.sourcePath).catch(()=>{});
                removed++;
            }
        }
        res.json({ success: true, removed });
    } catch (error) {
        console.error('Error in cancel:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/undo/status', (req, res) => {
    const { hasTransactions } = require('../services/transactionService');
    res.json({ canUndo: hasTransactions() });
});

router.post('/undo', async (req, res) => {
    try {
        const { popLastTransaction } = require('../services/transactionService');
        const tx = popLastTransaction();
        if (!tx) {
            return res.status(400).json({ error: 'No transaction available to undo.' });
        }

        const provider = getStorageProvider(config.storageTarget);
        let restoredCount = 0;
        const hashesToRemove = new Set();

        for (const file of tx.filesMoved) {
            if (file.hash) hashesToRemove.add(file.hash);
            const destExists = await provider.exists(file.destination);
            if (destExists) {
                if (!fs.existsSync(file.source)) {
                    const buffer = await provider.read(file.destination);
                    await fs.writeFile(file.source, buffer);
                }
                
                await provider.remove(file.destination);
                restoredCount++;

                const folderName = path.dirname(file.destination);
                if (folderName && folderName !== '.') {
                    const entries = await provider.list(folderName);
                    if (entries.length === 0) {
                        await provider.remove(folderName);
                    }
                }
            }
        }

        if (hashesToRemove.size > 0) {
            removeHashes(Array.from(hashesToRemove));
        }
        
        res.json({ success: true, restored: restoredCount });
    } catch (error) {
        console.error('Error in undo:', error);
        res.status(500).json({ error: error.message });
    }
});

// Drive Routes
router.get('/drive/status', (req, res) => {
    res.json({ 
        hasCredentials: hasCredentials(), 
        isAuthenticated: isAuthenticated(),
        authUrl: !isAuthenticated() && hasCredentials() ? getAuthUrl() : null
    });
});

router.post('/drive/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });
        await getAccessToken(code);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
