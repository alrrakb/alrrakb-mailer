/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// using anon key to simulate client request, but since RLS applies, we might get 0 rows or error.
// To fully simulate the client, we might need a user JWT, but let's first see if anon key throws an error.

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('ERROR OBJECT:', error);
        console.error('ERROR MESSAGE:', error.message);
        console.error('ERROR CODE:', error.code);
        console.error('JSON STR:', JSON.stringify(error));
    } else {
        console.log('SUCCESS! Data length:', data ? data.length : 0);
    }
}

testFetch();
