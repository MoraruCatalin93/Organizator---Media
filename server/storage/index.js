const StorageProvider = require('./Provider');
const LocalProvider = require('./LocalProvider');
const config = require('../config');

/**
 * Factory that returns the active storage backend.
 * Drive and S3 providers will be added in Sprint C without changing callers.
 * @param {'local'|'drive'|'s3'} [target]
 * @returns {StorageProvider}
 */
function getStorageProvider(target = config.storageTarget) {
    switch ((target || 'local').toLowerCase()) {
        case 'local':
        default:
            return new LocalProvider(config.outputDir);
        case 'drive':
            throw new Error('Storage Drive — implementat în Sprint C.');
        case 's3':
            throw new Error('Storage S3 — implementat în Sprint C.');
    }
}

module.exports = { StorageProvider, LocalProvider, getStorageProvider };
