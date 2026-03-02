import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkSchema() {
    await client.connect();

    console.log("--- Schema of Profiles ---");
    const orgs = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles';
    `);
    console.table(orgs.rows);

    await client.end();
}

checkSchema().catch(console.error);
