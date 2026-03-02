import pg from 'pg';

const { Client } = pg;
const password = 'e5u49WgFMFpPKVee';
const projectRef = 'vctzraffikmkhvpbkhtb';
const host = 'aws-0-us-west-2.pooler.supabase.com';

const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function restoreUser() {
    await client.connect();

    console.log("--- 7. Restoring Lexa Gestão Jurídica Profile (Definitive) ---");

    const userId = 'f6e1b56f-010e-44fd-b938-68bc8f0f572f'; // lexagestaojuridica@gmail.com
    const sysAdminId = '854f6292-bed6-4d8d-91e0-fd20b80260bb'; // Hardcoded Org ID for Lexa

    try {
        // 1. Create Profile (using valid columns only)
        await client.query(`
            INSERT INTO public.profiles (id, user_id, full_name, organization_id)
            VALUES ($1, $1, 'Administrador Lexa', $2)
            ON CONFLICT (id) DO NOTHING;
        `, [userId, sysAdminId]);
        console.log("Profile created or exists.");

        // 2. Create User Role (admin)
        await client.query(`
             INSERT INTO public.user_roles (user_id, organization_id, role)
             VALUES ($1, $2, 'admin')
             ON CONFLICT DO NOTHING;
         `, [userId, sysAdminId]);
        console.log("User Role (Admin) assigned.");

        console.log("✅ Master User Fully Restored!");
    } catch (err) {
        console.error("Error restoring user: ", err.message);
    }

    await client.end();
}

restoreUser().catch(console.error);
