import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function queryDB() {
    await client.connect();

    console.log("--- 1. Checking Profiles ---");
    const profiles = await client.query(`
        SELECT p.id, p.user_id, p.full_name, p.organization_id, o.name as org_name
        FROM public.profiles p
        LEFT JOIN public.organizations o ON o.id = p.organization_id
        WHERE p.full_name ILIKE '%lexa%' OR p.full_name ILIKE '%admin%' OR (SELECT email FROM auth.users WHERE id = p.user_id) = 'lexagestaojuridica@gmail.com'
    `);
    console.table(profiles.rows);

    await client.end();
}

queryDB().catch(console.error);
