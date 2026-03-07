import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Testing fetch...');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, permissions')
            .eq('id', 'e32bdd20-2229-4e5f-ae2d-4e802ce60f94')
            .single();

        if (error) {
            console.error('Fetch error:', error);
        } else {
            console.log('Fetch success:', data);
        }
    } catch (err) {
        console.error('Caught exception:', err);
    }
}

testFetch();
