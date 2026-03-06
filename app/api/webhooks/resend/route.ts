import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

// Define the expected structure of the Resend Event
type ResendEvent = {
    type: string;
    created_at: string;
    data: {
        created_at: string;
        email_id: string;
        from: string;
        to: string[];
        subject: string;
        status?: string;
        reason?: string;
        [key: string]: unknown;
    };
};

export async function POST(req: Request) {
    try {
        const payloadString = await req.text();
        const headersList = req.headers;

        // 1. Get Svix Headers
        const svixId = headersList.get('svix-id');
        const svixTimestamp = headersList.get('svix-timestamp');
        const svixSignature = headersList.get('svix-signature');

        if (!svixId || !svixTimestamp || !svixSignature) {
            return new NextResponse('Missing Svix Headers', { status: 400 });
        }

        const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('Missing RESEND_WEBHOOK_SECRET globally');
            return new NextResponse('Server Configuration Error', { status: 500 });
        }

        // 2. Verify Signature
        const wh = new Webhook(webhookSecret);
        let event: ResendEvent;

        try {
            event = wh.verify(payloadString, {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            }) as ResendEvent;
        } catch (err: unknown) {
            console.error('Webhook signature verification failed:', err instanceof Error ? err.message : String(err));
            return new NextResponse('Invalid Signature', { status: 401 });
        }

        console.log(`Received verified Resend event: ${event.type}`);

        // 3. Initialize Supabase Admin Client (Service Role allows bypassing RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const emailData = event.data;
        const recipients = emailData.to || [];

        // Determine mapped status
        let mappedStatus = 'sent';
        let isBounceOrComplaint = false;

        switch (event.type) {
            case 'email.delivered':
                mappedStatus = 'delivered';
                break;
            case 'email.bounced':
                mappedStatus = 'bounced';
                isBounceOrComplaint = true;
                break;
            case 'email.complained':
                mappedStatus = 'complained';
                isBounceOrComplaint = true;
                break;
            case 'email.opened':
                mappedStatus = 'opened';
                break;
            case 'email.clicked':
                mappedStatus = 'clicked';
                break;
            default:
                // Unhandled event (e.g., email.sent, email.delivery_delayed)
                return NextResponse.json({ received: true });
        }

        // 4. Update Database
        for (const recipient of recipients) {
            // Update sent_logs with the new status
            if (['delivered', 'bounced', 'complained', 'opened', 'clicked'].includes(mappedStatus)) {
                // Find the most recent log for this recipient
                const { data: recentLog } = await supabase
                    .from('sent_logs')
                    .select('id')
                    .eq('recipient', recipient)
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .single();

                if (recentLog) {
                    await supabase
                        .from('sent_logs')
                        .update({
                            status: mappedStatus,
                            ...(emailData.reason ? { error_message: emailData.reason } : {})
                        })
                        .eq('id', recentLog.id);
                }
            }

            // 5. BOUNCE MANAGEMENT STRATEGY
            // Flag the bounced/complained email across domain entities (contacts/hotels)
            if (isBounceOrComplaint) {
                console.warn(`Applying Bounce Management flag for: ${recipient}`);

                // Attempt to update Contacts
                await supabase
                    .from('contacts')
                    .update({ bounced: true })
                    .eq('email', recipient);

                // Attempt to update Hotels. 
                try {
                    await supabase
                        .from('hotels')
                        .update({ bounced: true })
                        .eq('email', recipient);
                } catch (e) {
                    console.error('Error updating hotels bounced status. The email column might not exist or match directly.', e);
                }
            }
        }

        return NextResponse.json({ success: true, processed: true });

    } catch (error: unknown) {
        console.error('Webhook Error:', error);
        return new NextResponse(`Webhook Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
}
