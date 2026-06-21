const fs = require('fs-extra');
const path = require('path');
const { getDb } = require('../db/connection');

const DB_JSON_PATH = path.join(__dirname, '../data/db.json');
const MIGRATED_PATH = path.join(__dirname, '../data/db.json.migrated');

function runMigration() {
    if (fs.existsSync(DB_JSON_PATH) && !fs.existsSync(MIGRATED_PATH)) {
        console.log('Found db.json, starting migration to SQLite...');
        const db = getDb();
        try {
            const data = fs.readJsonSync(DB_JSON_PATH);
            if (data.persons) {
                const insertTx = db.transaction(() => {
                    const insertPerson = db.prepare('INSERT OR IGNORE INTO persons (name) VALUES (?)');
                    const selectPerson = db.prepare('SELECT id FROM persons WHERE name = ?');
                    const insertDesc = db.prepare('INSERT INTO face_descriptors (person_id, descriptor) VALUES (?, ?)');
                    
                    for (const [name, descriptors] of Object.entries(data.persons)) {
                        insertPerson.run(name);
                        const person = selectPerson.get(name);
                        
                        if (person && Array.isArray(descriptors)) {
                            for (const desc of descriptors) {
                                insertDesc.run(person.id, JSON.stringify(desc));
                            }
                        }
                    }
                });
                
                insertTx();
                console.log('Migration complete.');
            }
            fs.renameSync(DB_JSON_PATH, MIGRATED_PATH);
            console.log('Renamed db.json to db.json.migrated');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
}

module.exports = {
    runMigration
};
