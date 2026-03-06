
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const adminEmail = 'admin@rrakb.com';
const adminPassword = 'T@laeAlR4kb#2026!P1';

async function createOrUpdateAdmin() {
    console.log(`Checking for existing user: ${adminEmail}`);

    // 1. Check if user exists (by listing, since getUser functions act on session usually)
    // Actually listUsers is the way for admin client
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const existingUser = users.find(u => u.email === adminEmail);

    if (existingUser) {
        console.log('User exists. Updating password...');
        const { error } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: adminPassword }
        );
        if (error) {
            console.error('Error updating password:', error);
        } else {
            console.log('Admin password updated successfully.');
        }
    } else {
        console.log('User does not exist. Creating...');
        const { error } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true
        });
        if (error) {
            console.error('Error creating user:', error);
        } else {
            console.log('Admin user created successfully.');
        }
    }
}

createOrUpdateAdmin();
