// Abstract storage interface. Every backend (Local, Drive, S3) implements this,
// so the rest of the app never touches fs/googleapis/s3 directly.
//
// All paths are RELATIVE to the provider's root (e.g. "Cata/IMG_001.jpg").
// Buffers are used for read/write to stay backend-agnostic.
class StorageProvider {
    constructor() {
        if (this.constructor === StorageProvider) {
            throw new Error('StorageProvider is abstract — instantiate a concrete provider.');
        }
    }

    /** List entries in a directory. → [{ name, isDir, path }] (path is relative) */
    async list(/** dirPath */) { throw new Error('list() not implemented'); }

    /** Read a file. → Buffer */
    async read(/** filePath */) { throw new Error('read() not implemented'); }

    /** Write a buffer to a path (creates parent dirs). */
    async write(/** filePath, buffer */) { throw new Error('write() not implemented'); }

    /** Ensure a directory exists. */
    async ensureDir(/** dirPath */) { throw new Error('ensureDir() not implemented'); }

    /** Check existence of a file/dir. → boolean */
    async exists(/** target */) { throw new Error('exists() not implemented'); }

    /** Remove a file/dir. */
    async remove(/** target */) { throw new Error('remove() not implemented'); }

    /** Human label for this backend, e.g. "local". */
    get type() { return 'base'; }
}

module.exports = StorageProvider;
