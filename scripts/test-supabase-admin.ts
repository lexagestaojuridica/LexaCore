import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('AQUI')) {
    console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSync() {
    console.log('🚀 Iniciando teste de sincronização de perfil...');

    const testUser = {
        user_id: 'user_test_clerk_123',
        full_name: 'Teste Webhook Clerk',
        avatar_url: 'https://img.clerk.com/test-avatar.png',
        updated_at: new Date().toISOString(),
    };

    console.log('📝 Tentando UPSERT de perfil de teste...');

    const { data, error } = await supabase
        .from('profiles')
        .upsert(testUser, { onConflict: 'user_id' })
        .select();

    if (error) {
        console.error('❌ Erro no Upsert:', error.message);
    } else {
        console.log('✅ Perfil sincronizado com sucesso:', data);
    }

    // Limpeza (opcional)
    // await supabase.from('profiles').delete().eq('user_id', testUser.user_id);
}

testSync();
