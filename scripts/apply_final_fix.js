import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';

// Standard direct connection is IPv6 only in newer Supabase projects, which can fail from some ISPs.
// Pooler connections (IPv4) require a specific port and user format.
const configs = [
    // 1. Transaction pooler (port 6543)
    {
        name: 'Transaction Pooler (us-west-2)',
        conn: `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`
    },
    // 2. Session pooler (port 5432)
    {
        name: 'Session Pooler (us-west-2)',
        conn: `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
    },
    // 3. Direct IPv6 connection (standard, but often fails on local machines without IPv6)
    {
        name: 'Direct Connection (IPv6)',
        conn: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
    }
];

const sql = `
-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can create processes in their org" ON public.processos_juridicos;
DROP POLICY IF EXISTS "Organization members can create processes" ON public.processos_juridicos;

-- Create correct INSERT policy
CREATE POLICY "Users can create processes in their org" ON public.processos_juridicos
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Ensure UPDATE policy exists and is correct
DROP POLICY IF EXISTS "Users can update processes in their org" ON public.processos_juridicos;
CREATE POLICY "Users can update processes in their org" ON public.processos_juridicos
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);
`;

async function tryConnect() {
    for (const config of configs) {
        console.log(`\nTrying: ${config.name}...`);
        const client = new Client({
            connectionString: config.conn,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000 // fail fast
        });

        try {
            await client.connect();
            console.log(`[SUCCESS] Connected via ${config.name}!`);

            console.log("Applying RLS migration to processos_juridicos...");
            await client.query(sql);
            console.log("✅ RLS Fixed Sucessfully!");

            await client.end();
            process.exit(0);
        } catch (e) {
            console.log(`[FAILED] ${e.message}`);
            client.end().catch(() => { });
        }
    }
    console.error("\n❌ Could not connect using any method.");
    process.exit(1);
}

tryConnect();
