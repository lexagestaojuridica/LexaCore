import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fixStorage() {
    await client.connect();

    console.log("--- Fixing Storage Bucket 'documentos' ---");

    try {
        // Create the bucket in storage.buckets
        await client.query(`
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('documentos', 'documentos', false)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log("Bucket 'documentos' verified.");

        // Apply RLS Policies for storage.objects
        // Allow select
        await client.query(`
            CREATE POLICY "Users can read their org documents" ON storage.objects
            FOR SELECT USING (
                bucket_id = 'documentos' AND 
                (auth.uid() = owner OR split_part(name, '/', 1) IN (
                    SELECT organization_id::text FROM public.profiles WHERE user_id = auth.uid()
                ))
            );
        `).catch(e => console.log("Select policy might already exist."));

        // Allow insert
        await client.query(`
            CREATE POLICY "Users can upload documents" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'documentos' AND
                auth.uid() = owner 
            );
        `).catch(e => console.log("Insert policy might already exist."));

        // Allow delete
        await client.query(`
            CREATE POLICY "Users can delete their documents" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'documentos' AND
                auth.uid() = owner 
            );
        `).catch(e => console.log("Delete policy might already exist."));

        console.log("Storage RLS Policies applied.");
    } catch (err) {
        console.error("Error setting storage: ", err.message);
    }

    await client.end();
}

fixStorage().catch(console.error);
