
import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { content, instruction } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const systemPrompt = `
        You are an expert email copy editor and designer. Your task is to REFINE the following email content HTML based on the user's instruction.
        
        INSTRUCTION: ${instruction || "Improve tone, formatting, and professionalism. Make it look modern."}
        
        CRITICAL RULES:
        1. Return ONLY the refined HTML code. Do NOT return JSON. Do not return markdown blocks.
        2. Maintain valid HTML structure suitable for email clients (inline styles preferred for compatibility, but simple CSS classes are okay if standard).
        3. Do NOT change the core meaning, just the presentation and flow unless asked otherwise.
        4. Use specific colors if requested.
        
        CURRENT CONTENT HTML:
        ${content}
        `;

        const responseText = await generateContent(systemPrompt);

        console.log("--- AI RAW RESPONSE START ---");
        console.log(responseText);
        console.log("--- AI RAW RESPONSE END ---");

        const cleanedResponse = responseText.replace(/```html/g, '').replace(/```/g, '').trim();

        console.log("cleanedResponse length:", cleanedResponse.length);
        console.log("original content length:", content.length);

        return NextResponse.json({ content: cleanedResponse });
    } catch (error: any) {
        console.error('AI Refine Error:', error);

        // Handle Rate Limits specifically
        if (error.message?.includes('429') || error.message?.includes('quota') || error.status === 429) {
            return NextResponse.json(
                { error: 'AI limit reached. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
