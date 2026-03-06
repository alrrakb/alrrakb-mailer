
import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { prompt, senderName } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const systemPrompt = `
        You are an expert email marketing assistant. Your task is to generate a professional marketing email based on the user's request.
        
        SENDER NAME: ${senderName || 'Marketing Team'}

        Please output strictly proper valid JSON with no markdown block.
        Format:
        {
            "subject": "The email subject line",
            "content": "The full HTML email body content (use semantic HTML, h1, p, lists, buttons etc)",
            "recipients": ["email1@example.com"] // Only if the user explicitly provided emails in the prompt, otherwise empty array
        }
        
        USER REQUEST: ${prompt}
        `;

        const responseText = await generateContent(systemPrompt);

        // Cleanup JSON string if it contains markdown code blocks
        const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedResponse);

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('AI Generate Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
