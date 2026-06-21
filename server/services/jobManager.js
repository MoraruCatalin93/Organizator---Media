const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { getStorageProvider } = require('../storage');
const { withJpgExt } = require('./imageService');
const { processImageFile, getDatabase, copyImageToFolders } = require('./storageService');
const { hasHash, getFileHash, addHashes } = require('./hashService');

const jobs = new Map();

const ALLOWED_IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i;

function createJob(type, payload) {
    const id = crypto.randomUUID();
    const job = {
        id,
        type, // 'local' or 'upload'
        status: 'pending', // 'pending', 'running', 'completed', 'cancelled', 'error'
        progress: 0,
        totalFiles: 0,
        processedFiles: 0,
        skippedDuplicates: 0,
        results: [],
        estimatedRemainingTime: null,
        startTime: null,
        payload,
        error: null,
        currentAction: 'Se inițializează...'
    };
    jobs.set(id, job);
    return id;
}

function getJob(id) {
    return jobs.get(id);
}

function cancelJob(id) {
    const job = jobs.get(id);
    if (job && (job.status === 'pending' || job.status === 'running')) {
        job.status = 'cancelled';
        job.currentAction = 'Anulat de utilizator.';
        return true;
    }
    return false;
}

async function retryJob(id) {
    const job = jobs.get(id);
    if (!job) throw new Error('Job not found');
    if (job.status === 'running') throw new Error('Job is already running');

    // Reset state
    job.status = 'pending';
    job.progress = 0;
    job.processedFiles = 0;
    job.skippedDuplicates = 0;
    job.results = [];
    job.error = null;
    job.startTime = null;
    job.estimatedRemainingTime = null;
    job.currentAction = 'Se inițializează...';

    // Start asynchronously
    if (job.type === 'local') {
        runLocalJob(job.id).catch(console.error);
    } else {
        runUploadJob(job.id).catch(console.error);
    }
}

async function runLocalJob(id) {
    const job = jobs.get(id);
    if (!job) return;

    job.status = 'running';
    job.startTime = Date.now();
    job.currentAction = 'Scanare folder...';

    const { folderPath, previewOnly, safePath } = job.payload;

    try {
        if (!fs.existsSync(safePath)) {
            throw new Error('Folderul nu există.');
        }

        const all = await fs.readdir(safePath);
        const imageFiles = all.filter(f => ALLOWED_IMAGE_RE.test(f));
        
        job.totalFiles = imageFiles.length;
        if (imageFiles.length === 0) {
            job.status = 'completed';
            job.progress = 100;
            job.currentAction = 'Finalizat (fără imagini).';
            return;
        }

        const db = getDatabase();
        const provider = getStorageProvider(config.storageTarget);
        const batchHashes = new Set();
        const transientUnknowns = {};

        for (let i = 0; i < imageFiles.length; i++) {
            if (job.status === 'cancelled') {
                break;
            }

            const file = imageFiles[i];
            job.currentAction = `Analizez ${i + 1}/${imageFiles.length}: ${file}`;
            const fullPath = path.join(safePath, file);
            
            const hash = await getFileHash(fullPath);
            if (hasHash(hash) || batchHashes.has(hash)) {
                job.skippedDuplicates++;
                job.processedFiles++;
                updateProgressAndETA(job);
                continue;
            }
            batchHashes.add(hash);

            const { matched, storeBuffer, converted, details } = await processImageFile(fullPath, db, transientUnknowns);
            const storeName = converted ? withJpgExt(file) : file;
            
            if (!previewOnly) {
                await copyImageToFolders(storeBuffer, matched, storeName, provider);
                addHashes([hash]);
            }

            const previewItems = details && details.length > 0 ? details.map(d => ({
                sourceFile: file,
                sourcePath: fullPath,
                detectedPerson: d.label,
                confidence: typeof d.distance === 'number' ? Math.round((1 - d.distance) * 100) + '%' : 'N/A',
                destinationFolder: path.join(config.outputDir, d.label),
                isTempUpload: false,
                storeName: storeName,
                hash: hash,
                descriptor: d.descriptor
            })) : [{
                sourceFile: file,
                sourcePath: fullPath,
                detectedPerson: matched[0] || 'Unknown',
                confidence: 'N/A',
                destinationFolder: path.join(config.outputDir, matched[0] || 'Unknown'),
                isTempUpload: false,
                storeName: storeName,
                hash: hash
            }];

            job.results.push(...previewItems);
            job.processedFiles++;
            updateProgressAndETA(job);
        }

        if (job.status !== 'cancelled') {
            job.status = 'completed';
            job.progress = 100;
            job.currentAction = 'Procesare completă!';
            job.estimatedRemainingTime = null;
        }

    } catch (err) {
        console.error('Job error:', err);
        job.status = 'error';
        job.error = err.message;
        job.currentAction = 'Eroare întâmpinată.';
    }
}

async function runUploadJob(id) {
    const job = jobs.get(id);
    if (!job) return;

    job.status = 'running';
    job.startTime = Date.now();
    job.currentAction = 'Procesare fișiere încărcate...';

    const { files, previewOnly } = job.payload;
    job.totalFiles = files.length;

    try {
        const db = getDatabase();
        const provider = getStorageProvider(config.storageTarget);
        const batchHashes = new Set();
        const transientUnknowns = {};

        for (let i = 0; i < files.length; i++) {
            if (job.status === 'cancelled') {
                break;
            }

            const file = files[i];
            job.currentAction = `Analizez ${i + 1}/${files.length}: ${file.originalname}`;
            
            const hash = await getFileHash(file.path);
            if (hasHash(hash) || batchHashes.has(hash)) {
                job.skippedDuplicates++;
                job.processedFiles++;
                await fs.remove(file.path).catch(()=>{});
                updateProgressAndETA(job);
                continue;
            }
            batchHashes.add(hash);

            const { matched, storeBuffer, converted, details } = await processImageFile(file.path, db, transientUnknowns);
            const storeName = converted ? withJpgExt(file.originalname) : file.originalname;
            
            if (!previewOnly) {
                await copyImageToFolders(storeBuffer, matched, storeName, provider);
                await fs.remove(file.path).catch(()=>{});
                addHashes([hash]);
            }

            const previewItems = details && details.length > 0 ? details.map(d => ({
                sourceFile: file.originalname,
                sourcePath: file.path,
                detectedPerson: d.label,
                confidence: typeof d.distance === 'number' ? Math.round((1 - d.distance) * 100) + '%' : 'N/A',
                destinationFolder: path.join(config.outputDir, d.label),
                isTempUpload: true,
                storeName: storeName,
                hash: hash,
                descriptor: d.descriptor
            })) : [{
                sourceFile: file.originalname,
                sourcePath: file.path,
                detectedPerson: matched[0] || 'Unknown',
                confidence: 'N/A',
                destinationFolder: path.join(config.outputDir, matched[0] || 'Unknown'),
                isTempUpload: true,
                storeName: storeName,
                hash: hash
            }];

            job.results.push(...previewItems);
            job.processedFiles++;
            updateProgressAndETA(job);
        }

        // Cleanup on cancel
        if (job.status === 'cancelled') {
            for (const file of files) {
                await fs.remove(file.path).catch(()=>{});
            }
        } else {
            job.status = 'completed';
            job.progress = 100;
            job.currentAction = 'Procesare completă!';
            job.estimatedRemainingTime = null;
        }

    } catch (err) {
        console.error('Job error:', err);
        job.status = 'error';
        job.error = err.message;
        job.currentAction = 'Eroare întâmpinată.';
        // Attempt cleanup
        for (const file of files) {
            await fs.remove(file.path).catch(()=>{});
        }
    }
}

function updateProgressAndETA(job) {
    if (job.totalFiles > 0) {
        job.progress = (job.processedFiles / job.totalFiles) * 100;
    }
    
    if (job.processedFiles > 0) {
        const elapsed = Date.now() - job.startTime;
        const timePerFile = elapsed / job.processedFiles;
        const remainingFiles = job.totalFiles - job.processedFiles;
        job.estimatedRemainingTime = timePerFile * remainingFiles;
    }
}

module.exports = {
    createJob,
    getJob,
    cancelJob,
    retryJob,
    runLocalJob,
    runUploadJob
};
