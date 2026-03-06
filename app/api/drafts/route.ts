import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialized inside handler

export async function DELETE(req: Request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('drafts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Draft deleted successfully' });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
