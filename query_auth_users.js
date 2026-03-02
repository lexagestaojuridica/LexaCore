import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function queryDB() {
    await client.connect();

    console.log("--- 3. Fetching from auth.users ---");
    const users = await client.query(`
        SELECT id, email, created_at
        FROM auth.users
        LIMIT 5
    `);
    console.table(users.rows);

    await client.end();
}

queryDB().catch(console.error);
