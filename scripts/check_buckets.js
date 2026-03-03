import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vctzraffikmkhvpbkhtb.supabase.co';
const supabaseKey = 'e5u49WgFMFpPKVee'; // wait, you need the service role key or anon key to list buckets using the js client. Actually I'll use pg to check storage.buckets table directly!
