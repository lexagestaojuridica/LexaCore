import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function queryDB() {
    await client.connect();

    console.log("--- 2. Fetching all profiles ---");
    const profiles = await client.query(`
        SELECT p.id, p.user_id, p.full_name, p.organization_id
        FROM public.profiles p
        LIMIT 5
    `);
    console.table(profiles.rows);

    await client.end();
}

queryDB().catch(console.error);
