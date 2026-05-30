const fs = require('fs');
const path = require('path');
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAwNTQ5OTcsImlkIjoiMDE5ZTczOGItNGUwMS03MzNlLWE0ZmItOTkxNDZmNjQxOGRkIiwicmlkIjoiNzJjODViY2QtNWRiZC00MmIyLThhMzktNjAzYmE2YWExNDllIn0.CwERuLGNDuw6g07x1UOgreLh0HBDfT1cs4rspU4Ac8QgCvSLuYanW-tvAYdU9FJMJRPlVhYPrE_3tqc5NR8LDQ';
const url = 'https://vocab-zhutoubaba.aws-ap-northeast-1.turso.io/v2/pipeline';
// Helper function to send requests to Turso
async function executeSql(statements) {
    const requests = statements.map(stmt => {
        if (typeof stmt === 'string') {
            return { type: 'execute', stmt: { sql: stmt } };
        } else {
            return { type: 'execute', stmt: { sql: stmt.sql, args: stmt.args || [] } };
        }
    });
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${text}`);
    }
    const data = await response.json();

    // Verify results for errors
    if (data.results) {
        for (const res of data.results) {
            if (res.type === 'error') {
                throw new Error(`SQL Error: ${res.error.message}`);
            }
        }
    }

    return data.results.map(r => r.response.result);
}
// Robust RFC-4180 CSV parser
function parseRawCSV(csvContent) {
    const result = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const nextChar = csvContent[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',') {
            if (inQuotes) {
                currentField += char;
            } else {
                currentRow.push(currentField);
                currentField = '';
            }
        } else if (char === '\r' || char === '\n') {
            if (inQuotes) {
                currentField += char;
            } else {
                if (char === '\r' && nextChar === '\n') {
                    i++; // skip \n
                }
                currentRow.push(currentField);
                result.push(currentRow);
                currentRow = [];
                currentField = '';
            }
        } else {
            currentField += char;
        }
    }
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        result.push(currentRow);
    }
    return result;
}
function parseVocabularyCSV(csvContent) {
    const rows = parseRawCSV(csvContent);
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const wordIdx = headers.indexOf('word');

    if (wordIdx === -1) {
        return [];
    }
    const phoneticIdx = headers.indexOf('phonetic');
    const defEnIdx = headers.indexOf('definition_en');
    const defJaIdx = headers.indexOf('definition_ja');

    const sentencesIdx = headers.indexOf('sentences');
    const sentence1Idx = headers.indexOf('sentence_1');
    const sentence2Idx = headers.indexOf('sentence_2');
    const sentence3Idx = headers.indexOf('sentence_3');
    const result = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
            continue;
        }
        const word = row[wordIdx] ? row[wordIdx].trim() : '';
        if (!word) continue;
        const phonetic = phoneticIdx !== -1 && row[phoneticIdx] !== undefined ? row[phoneticIdx].trim() : '';
        const definition_en = defEnIdx !== -1 && row[defEnIdx] !== undefined ? row[defEnIdx].trim() : '';
        const definition_ja = defJaIdx !== -1 && row[defJaIdx] !== undefined ? row[defJaIdx].trim() : '';

        const sentences = [];
        if (sentencesIdx !== -1 && row[sentencesIdx]) {
            const splitSentences = row[sentencesIdx]
                .split('|')
                .map(s => s.trim())
                .filter(Boolean);
            sentences.push(...splitSentences);
        }
        if (sentence1Idx !== -1 && row[sentence1Idx] !== undefined && row[sentence1Idx].trim()) {
            sentences.push(row[sentence1Idx].trim());
        }
        if (sentence2Idx !== -1 && row[sentence2Idx] !== undefined && row[sentence2Idx].trim()) {
            sentences.push(row[sentence2Idx].trim());
        }
        if (sentence3Idx !== -1 && row[sentence3Idx] !== undefined && row[sentence3Idx].trim()) {
            sentences.push(row[sentence3Idx].trim());
        }
        result.push({
            word,
            phonetic,
            definition_en,
            definition_ja,
            sentences: sentences.slice(0, 3)
        });
    }
    return result;
}
async function run() {
    try {
        console.log('--- Initializing database tables ---');
        await executeSql([
            `CREATE TABLE IF NOT EXISTS word_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
      );`,
            `CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        word TEXT NOT NULL,
        phonetic TEXT DEFAULT '',
        definition_en TEXT DEFAULT '',
        definition_ja TEXT DEFAULT '',
        sentences TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        FOREIGN KEY (set_id) REFERENCES word_sets(id) ON DELETE CASCADE
      );`
        ]);
        console.log('Tables initialized successfully.');
        const seedsDir = path.join(__dirname, './seeds');
        const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.csv'));
        console.log(`Found ${files.length} seed CSV files to import.`);
        for (const file of files) {
            const setName = path.basename(file, '.csv');
            console.log(`\nImporting set: "${setName}"...`);
            const csvContent = fs.readFileSync(path.join(seedsDir, file), 'utf8');
            const words = parseVocabularyCSV(csvContent);
            console.log(`Parsed ${words.length} words from "${file}"`);
            // Check if set already exists, otherwise insert it
            const existingSets = await executeSql([
                { sql: 'SELECT id FROM word_sets WHERE name = ? LIMIT 1;', args: [{ type: 'text', value: setName }] }
            ]);

            let setId;
            const rows = existingSets[0].rows;
            if (rows && rows.length > 0) {
                setId = parseInt(rows[0][0].value, 10);
                console.log(`Word set "${setName}" already exists with ID: ${setId}`);
            } else {
                const insertRes = await executeSql([
                    {
                        sql: 'INSERT INTO word_sets (name, created_at) VALUES (?, ?);',
                        args: [
                            { type: 'text', value: setName },
                            { type: 'text', value: new Date().toISOString() }
                        ]
                    }
                ]);
                setId = parseInt(insertRes[0].last_insert_rowid, 10);
                console.log(`Created word set "${setName}" with ID: ${setId}`);
            }
            // Check existing words in this set to find what to insert, update, or delete
            const existingWordsRes = await executeSql([
                { 
                    sql: 'SELECT id, word, phonetic, definition_en, definition_ja, sentences FROM words WHERE set_id = ?;', 
                    args: [{ type: 'integer', value: setId.toString() }] 
                }
            ]);

            const existingWordsMap = new Map();
            if (existingWordsRes[0] && existingWordsRes[0].rows) {
                for (const row of existingWordsRes[0].rows) {
                    const id = parseInt(row[0].value, 10);
                    const word = row[1].value ? row[1].value.toString() : '';
                    const phonetic = row[2] && row[2].value !== null ? row[2].value.toString() : '';
                    const definition_en = row[3] && row[3].value !== null ? row[3].value.toString() : '';
                    const definition_ja = row[4] && row[4].value !== null ? row[4].value.toString() : '';
                    const sentencesStr = row[5] && row[5].value !== null ? row[5].value.toString() : '[]';
                    let sentences = [];
                    try {
                        sentences = JSON.parse(sentencesStr);
                    } catch (e) {
                        sentences = [];
                    }
                    existingWordsMap.set(word.toLowerCase().trim(), {
                        id,
                        word,
                        phonetic,
                        definition_en,
                        definition_ja,
                        sentences
                    });
                }
            }

            const wordsToInsert = [];
            const wordsToUpdate = [];
            const csvWordsSet = new Set();

            for (const csvWord of words) {
                const key = csvWord.word.toLowerCase().trim();
                csvWordsSet.add(key);

                const dbWord = existingWordsMap.get(key);
                if (!dbWord) {
                    wordsToInsert.push(csvWord);
                } else {
                    const needsUpdate = 
                        csvWord.word !== dbWord.word ||
                        csvWord.phonetic !== dbWord.phonetic ||
                        csvWord.definition_en !== dbWord.definition_en ||
                        csvWord.definition_ja !== dbWord.definition_ja ||
                        JSON.stringify(csvWord.sentences) !== JSON.stringify(dbWord.sentences);
                    
                    if (needsUpdate) {
                        wordsToUpdate.push({
                            id: dbWord.id,
                            ...csvWord
                        });
                    }
                }
            }

            const wordsToDelete = [];
            for (const [key, dbWord] of existingWordsMap.entries()) {
                if (!csvWordsSet.has(key)) {
                    wordsToDelete.push(dbWord);
                }
            }

            console.log(`Merge summary for set "${setName}":`);
            console.log(`  - To insert: ${wordsToInsert.length}`);
            console.log(`  - To update: ${wordsToUpdate.length}`);
            console.log(`  - To delete: ${wordsToDelete.length}`);

            const batchSize = 100;

            // 1. Insert new words
            for (let i = 0; i < wordsToInsert.length; i += batchSize) {
                const batch = wordsToInsert.slice(i, i + batchSize);
                const insertStatements = batch.map(w => ({
                    sql: `INSERT INTO words (set_id, word, phonetic, definition_en, definition_ja, sentences, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    args: [
                        { type: 'integer', value: setId.toString() },
                        { type: 'text', value: w.word },
                        { type: 'text', value: w.phonetic },
                        { type: 'text', value: w.definition_en },
                        { type: 'text', value: w.definition_ja },
                        { type: 'text', value: JSON.stringify(w.sentences) },
                        { type: 'text', value: new Date().toISOString() }
                    ]
                }));
                await executeSql(insertStatements);
                console.log(`  Inserted batch of ${batch.length} words...`);
            }

            // 2. Update existing words
            for (let i = 0; i < wordsToUpdate.length; i += batchSize) {
                const batch = wordsToUpdate.slice(i, i + batchSize);
                const updateStatements = batch.map(w => ({
                    sql: `UPDATE words SET word = ?, phonetic = ?, definition_en = ?, definition_ja = ?, sentences = ? WHERE id = ?;`,
                    args: [
                        { type: 'text', value: w.word },
                        { type: 'text', value: w.phonetic },
                        { type: 'text', value: w.definition_en },
                        { type: 'text', value: w.definition_ja },
                        { type: 'text', value: JSON.stringify(w.sentences) },
                        { type: 'integer', value: w.id.toString() }
                    ]
                }));
                await executeSql(updateStatements);
                console.log(`  Updated batch of ${batch.length} words...`);
            }

            // 3. Delete obsolete words
            for (let i = 0; i < wordsToDelete.length; i += batchSize) {
                const batch = wordsToDelete.slice(i, i + batchSize);
                const deleteStatements = batch.map(w => ({
                    sql: `DELETE FROM words WHERE id = ?;`,
                    args: [
                        { type: 'integer', value: w.id.toString() }
                    ]
                }));
                await executeSql(deleteStatements);
                console.log(`  Deleted batch of ${batch.length} words...`);
            }

            console.log(`Completed merging "${setName}".`);
        }
        console.log('\n--- Seeding process completed successfully! ---');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}
run();