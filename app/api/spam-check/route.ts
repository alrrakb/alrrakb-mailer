import { NextResponse } from 'next/server';
import { calculateSpamScore } from '@/lib/spamChecker';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subject, body: emailBody } = body;

        if (subject === undefined || emailBody === undefined) {
            return NextResponse.json(
                { error: 'Missing subject or body in request' },
                { status: 400 }
            );
        }

        const result = calculateSpamScore(subject, emailBody);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error calculating spam score:', error);
        return NextResponse.json(
            { error: 'Failed to calculate spam score' },
            { status: 500 }
        );
    }
}
