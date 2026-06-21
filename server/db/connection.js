const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

const DB_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

fs.ensureDirSync(DB_DIR);

let db = null;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        // Ensure foreign keys are enabled
        db.pragma('foreign_keys = ON');
        
        // Execute schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schema);
    }
    return db;
}

module.exports = {
    getDb
};
