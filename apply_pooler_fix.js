import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';

const hostNameVariants = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com'
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
    for (const host of hostNameVariants) {
        // Pooler requires the username to be postgres.[projectRef]
        // or just connect to the session pool on port 5432
        const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:5432/postgres`;
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        try {
            console.log(`Trying ${host}...`);
            await client.connect();
            console.log(`[SUCCESS] Connected to ${host}`);

            console.log("Applying RLS migration...");
            await client.query(sql);
            console.log("[SUCCESS] RLS Fixed!");

            await client.end();
            process.exit(0);
        } catch (e) {
            console.log(`[FAILED] ${host}: ${e.message}`);
        }
    }
    console.error("Could not connect to any pooler variant.");
    process.exit(1);
}

tryConnect();
