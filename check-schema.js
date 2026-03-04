import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsPath = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));

let tables = {};

for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');

    const regex = /CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const tableName = match[1];
        const columns = match[2];

        tables[tableName] = {
            hasOrganizationId: columns.toLowerCase().includes('organization_id'),
            columns: columns.split('\n').map(l => l.trim()).filter(Boolean)
        };
    }
}

const missingOrgId = Object.keys(tables).filter(t => !tables[t].hasOrganizationId);

console.log("=== TABELAS SEM ORGANIZATION_ID ===");
console.log(missingOrgId.join('\n'));
console.log("\n=== TOTAL DE TABELAS MAPEADAS ===");
console.log(Object.keys(tables).length);
