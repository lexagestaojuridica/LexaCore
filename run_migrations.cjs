const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: 'postgresql://postgres.vctzraffikmkhvpbkhtb:e5u49WgFMFpPKVee@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
});

async function runSQL() {
    try {
        await client.connect();
        console.log("Connected to Supabase DB");

        // First: apply the rh_master schema (creates tables)
        const masterSql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20240324140000_modulo_rh_master.sql'), 'utf8');
        console.log("Executing modulo_rh_master...");
        await client.query(masterSql);
        console.log("modulo_rh_master executed successfully!");

        // Second: apply the new RLS policies
        const rlsSql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260227000001_rls_rh_agenda.sql'), 'utf8');
        console.log("Executing rls_rh_agenda...");
        await client.query(rlsSql);
        console.log("rls_rh_agenda executed successfully!");

    } catch (err) {
        console.error("Error executing SQL:", err.message);
    } finally {
        await client.end();
    }
}

runSQL();
