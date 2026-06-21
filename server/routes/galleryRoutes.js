const express = require('express');
const config = require('../config');
const { getStorageProvider } = require('../storage');

const router = express.Router();

const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$/i;

/**
 * GET /api/gallery
 * Lists the organized output tree:
 *   { persons: [ { name, count, files: [{ name, path }] } ] }
 */
router.get('/', async (_req, res) => {
    try {
        const provider = getStorageProvider(config.storageTarget);
        const entries = await provider.list('');
        const { getPersonsSummary } = require('../repositories/personRepository');
        const dbSummary = getPersonsSummary(true);
        const unknownSet = new Set(dbSummary.filter(p => p.is_unknown).map(p => p.name));

        const known = [];
        const unknown = [];
        let totalImages = 0;

        for (const entry of entries) {
            if (!entry.isDir) continue;
            const files = await provider.list(entry.path);
            const images = files
                .filter(f => !f.isDir && IMAGE_RE.test(f.name))
                .map(f => ({ name: f.name, path: f.path }));
            if (images.length === 0) continue;
            
            const personObj = { name: entry.name, count: images.length, files: images };
            totalImages += images.length;
            
            if (unknownSet.has(entry.name) || entry.name.startsWith('Necunoscut')) {
                unknown.push(personObj);
            } else {
                known.push(personObj);
            }
        }

        known.sort((a, b) => b.count - a.count);
        unknown.sort((a, b) => b.count - a.count);

        res.json({ known, unknown, totalImages });
    } catch (e) {
        console.error('Gallery list error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
