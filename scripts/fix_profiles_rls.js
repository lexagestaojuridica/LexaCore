import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fixProfileRls() {
    await client.connect();

    console.log("--- 8. Fixing Profiles and Organizations RLS ---");

    try {
        // Since there are zero policies, let's create the standard ones.

        // Profiles: Users can select their own profile.
        await client.query(`
            CREATE POLICY "Users can read own profile" ON public.profiles
            FOR SELECT USING ( auth.uid() = user_id );
        `);
        console.log("Policy added: Users can read own profile");

        // Profiles: Users can update their own profile.
        await client.query(`
            CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING ( auth.uid() = user_id );
        `);
        console.log("Policy added: Users can update own profile");

        // Organizations: Members can read their own organization.
        await client.query(`
            CREATE POLICY "Members can read own organization" ON public.organizations
            FOR SELECT USING (
                id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
            );
        `);
        console.log("Policy added: Members can read own organization");

        console.log("✅ RLS read policies restored for Profiles and Organizations!");
    } catch (err) {
        console.error("Error setting policies: ", err.message);
    }

    await client.end();
}

fixProfileRls().catch(console.error);
