const { getDb } = require('../db/connection');

function getAllPersonsWithDescriptors(includeUnknowns = true) {
    const db = getDb();
    const query = includeUnknowns 
        ? `SELECT p.name, fd.descriptor FROM persons p JOIN face_descriptors fd ON p.id = fd.person_id`
        : `SELECT p.name, fd.descriptor FROM persons p JOIN face_descriptors fd ON p.id = fd.person_id WHERE p.is_unknown = 0`;
        
    const rows = db.prepare(query).all();

    const result = {};
    for (const row of rows) {
        if (!result[row.name]) {
            result[row.name] = [];
        }
        result[row.name].push(JSON.parse(row.descriptor));
    }
    return result;
}

function getPersonsSummary(includeUnknowns = false) {
    const db = getDb();
    const query = includeUnknowns
        ? `SELECT p.name, COUNT(fd.id) as samples, p.is_unknown
           FROM persons p
           LEFT JOIN face_descriptors fd ON p.id = fd.person_id
           GROUP BY p.id`
        : `SELECT p.name, COUNT(fd.id) as samples
           FROM persons p
           LEFT JOIN face_descriptors fd ON p.id = fd.person_id
           WHERE p.is_unknown = 0
           GROUP BY p.id`;
    return db.prepare(query).all();
}

function addPersonDescriptor(name, descriptorArray, isUnknown = false, imagePath = null) {
    const db = getDb();
    
    const insertTx = db.transaction(() => {
        let person = db.prepare('SELECT id FROM persons WHERE name = ?').get(name);
        if (!person) {
            const info = db.prepare('INSERT INTO persons (name, is_unknown) VALUES (?, ?)').run(name, isUnknown ? 1 : 0);
            person = { id: info.lastInsertRowid };
        }
        
        // Determine if this is the first reference
        const count = db.prepare('SELECT COUNT(*) as count FROM face_descriptors WHERE person_id = ?').get(person.id).count;
        const isPrimary = count === 0 ? 1 : 0;
        
        db.prepare('INSERT INTO face_descriptors (person_id, descriptor, image_path, is_primary) VALUES (?, ?, ?, ?)').run(
            person.id,
            JSON.stringify(descriptorArray),
            imagePath,
            isPrimary
        );
    });
    
    insertTx();
}

function deletePerson(name) {
    const db = getDb();
    const info = db.prepare('DELETE FROM persons WHERE name = ?').run(name);
    return info.changes > 0;
}

function renamePerson(oldName, newName) {
    const db = getDb();
    const tx = db.transaction(() => {
        const oldPerson = db.prepare('SELECT id FROM persons WHERE name = ?').get(oldName);
        if (!oldPerson) throw new Error('Persoana veche nu a fost găsită.');
        
        const newPerson = db.prepare('SELECT id FROM persons WHERE name = ?').get(newName);
        
        if (newPerson) {
            // Merge: Move descriptors to newPerson, delete oldPerson
            db.prepare('UPDATE face_descriptors SET person_id = ? WHERE person_id = ?').run(newPerson.id, oldPerson.id);
            db.prepare('DELETE FROM persons WHERE id = ?').run(oldPerson.id);
        } else {
            // Rename
            db.prepare('UPDATE persons SET name = ?, is_unknown = 0 WHERE id = ?').run(newName, oldPerson.id);
        }
    });
    tx();
}

function getPersonReferences(name) {
    const db = getDb();
    return db.prepare(`
        SELECT fd.id, fd.image_path, fd.is_primary, fd.created_at
        FROM face_descriptors fd
        JOIN persons p ON p.id = fd.person_id
        WHERE p.name = ?
        ORDER BY fd.is_primary DESC, fd.created_at ASC
    `).all(name);
}

function deleteReference(id) {
    const db = getDb();
    const ref = db.prepare('SELECT image_path FROM face_descriptors WHERE id = ?').get(id);
    if (ref) {
        db.prepare('DELETE FROM face_descriptors WHERE id = ?').run(id);
    }
    return ref;
}

function setPrimaryReference(id, personName) {
    const db = getDb();
    const tx = db.transaction(() => {
        const person = db.prepare('SELECT id FROM persons WHERE name = ?').get(personName);
        if (person) {
            db.prepare('UPDATE face_descriptors SET is_primary = 0 WHERE person_id = ?').run(person.id);
            db.prepare('UPDATE face_descriptors SET is_primary = 1 WHERE id = ? AND person_id = ?').run(id, person.id);
        }
    });
    tx();
}

module.exports = {
    getAllPersonsWithDescriptors,
    getPersonsSummary,
    addPersonDescriptor,
    deletePerson,
    renamePerson,
    getPersonReferences,
    deleteReference,
    setPrimaryReference
};
