import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://postgres:e5u49WgFMFpPKVee@db.vctzraffikmkhvpbkhtb.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();
    console.log('Connected to remote DB!');

    const dir = './supabase/migrations';
    const files = fs.readdirSync(dir).sort();

    for (const file of files) {
        if (!file.endsWith('.sql')) continue;

        console.log(`\nExecuting ${file}...`);
        const script = fs.readFileSync(path.join(dir, file), 'utf8');

        try {
            await client.query(script);
            console.log(`[OK] ${file}`);
        } catch (err) {
            console.log(`[SKIP/ERROR] ${file} - ${err.message}`);
        }
    }

    await client.end();
}

run();
