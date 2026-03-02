import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkPolicies() {
    await client.connect();

    console.log("--- Policies for public.profiles ---");
    const policies = await client.query(`
        SELECT polname, polcmd, polqual, polwithcheck
        FROM pg_policy
        WHERE polrelid = 'public.profiles'::regclass;
    `);
    console.table(policies.rows);

    await client.end();
}

checkPolicies().catch(console.error);
