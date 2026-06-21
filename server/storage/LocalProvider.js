const fs = require('fs-extra');
const path = require('path');
const StorageProvider = require('./Provider');

/**
 * Filesystem-backed provider. Rooted at a directory; all paths resolved
 * relative to it and confined inside it (no traversal outside root).
 */
class LocalProvider extends StorageProvider {
    constructor(rootDir) {
        super();
        this.rootDir = path.resolve(rootDir);
    }

    get type() { return 'local'; }
    getRoot() { return this.rootDir; }

    _resolve(relPath = '') {
        const resolved = path.resolve(this.rootDir, relPath);
        const rel = path.relative(this.rootDir, resolved);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new Error('Cale în afara zonei permise.');
        }
        return resolved;
    }

    async list(dirPath = '') {
        const dir = this._resolve(dirPath);
        if (!(await fs.pathExists(dir))) return [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries.map(e => ({
            name: e.name,
            isDir: e.isDirectory(),
            path: path.relative(this.rootDir, path.join(dir, e.name)),
        }));
    }

    async read(filePath) {
        return fs.readFile(this._resolve(filePath));
    }

    async write(filePath, buffer) {
        const full = this._resolve(filePath);
        await fs.ensureDir(path.dirname(full));
        await fs.writeFile(full, buffer);
    }

    async ensureDir(dirPath) {
        return fs.ensureDir(this._resolve(dirPath));
    }

    async exists(target) {
        return fs.pathExists(this._resolve(target));
    }

    async remove(target) {
        return fs.remove(this._resolve(target));
    }
}

module.exports = LocalProvider;
