import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fixProcessSelectRls() {
    await client.connect();

    console.log("--- 9. Fixing Processos Jurídicos RLS (SELECT) ---");

    try {
        // Drop any existing SELECT or ALL policies to avoid conflict
        await client.query(`DROP POLICY IF EXISTS "Users can read processes in their org" ON public.processos_juridicos;`);
        await client.query(`DROP POLICY IF EXISTS "Organization members can read processes" ON public.processos_juridicos;`);

        // Create the correct SELECT policy
        await client.query(`
            CREATE POLICY "Users can read processes in their org" ON public.processos_juridicos
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
                )
            );
        `);
        console.log("Policy added: Users can read processes in their org");

        console.log("✅ RLS SELECT policy restored for Processos Jurídicos!");
    } catch (err) {
        console.error("Error setting policies: ", err.message);
    }

    await client.end();
}

fixProcessSelectRls().catch(console.error);
