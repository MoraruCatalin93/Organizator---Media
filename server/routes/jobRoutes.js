const express = require('express');
const { getJob, cancelJob, retryJob } = require('../services/jobManager');

const router = express.Router();

// Get job status
router.get('/:id', (req, res) => {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Omit payload from response to save bandwidth
    const { payload, ...safeJob } = job;
    res.json(safeJob);
});

// Cancel job
router.post('/:id/cancel', (req, res) => {
    const success = cancelJob(req.params.id);
    if (!success) return res.status(400).json({ error: 'Job cannot be cancelled (might not exist or already finished)' });
    res.json({ success: true });
});

// Retry job
router.post('/:id/retry', async (req, res) => {
    try {
        await retryJob(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
