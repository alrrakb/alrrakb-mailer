import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Initialize the Gemini AI SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
        }

        const { messages, systemPrompt: customSystemPrompt } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        let userCustomPrompt = '';
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll()
                        },
                        setAll(cookiesToSet) {
                            try {
                                cookiesToSet.forEach(({ name, value, options }) =>
                                    cookieStore.set(name, value, options)
                                )
                            } catch (_) { }
                        },
                    },
                }
            );

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user?.id) {
                const { data } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('user_id', session.user.id)
                    .eq('key', 'ai_system_prompt')
                    .maybeSingle();

                if (data?.value) {
                    userCustomPrompt = data.value;
                }
            }
        } catch (err) {
            console.error('Failed to get user session for settings', err);
        }

        const basePrompt = customSystemPrompt || `
        You are an expert email marketing assistant and copywriter.
        The user needs help writing or continuing an email draft.
        
        Write professional, highly engaging email sections or provide general advice.
        If the user asks you to write an email or a specific section for the editor, YOUR RESPONSE MUST BE RAW HTML ONLY (using semantic tags like <h1>, <p>, <br>, <ul>, <li>, <strong>, <em>).
        Do NOT wrap the HTML response in markdown blocks like \`\`\`html ... \`\`\`. Do NOT include surrounding text for HTML drafts.
        If the user is asking for general advice, answer normally using plain text or markdown as appropriate.
        `;

        const systemPrompt = userCustomPrompt
            ? `${basePrompt}\n\nIMPORTANT USER CUSTOM INSTRUCTIONS (Follow these strictly regarding tone, context, and persona):\n${userCustomPrompt}`
            : basePrompt;

        const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Gemini API requires the first message in the history block to be from a 'user'
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        const fallbackModels = [
            'gemini-3.1-pro-preview',
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-3-flash-preview',
            'gemini-2.5-flash-lite'
        ];

        let responseText: string | null = null;
        let lastError: unknown = null;

        for (const modelName of fallbackModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const chatWithHistory = model.startChat({
                    history: history,
                    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
                });

                const latestMessage = messages[messages.length - 1].content;
                const result = await chatWithHistory.sendMessage(latestMessage);

                responseText = result.response.text();

                // Success, break out of fallback loop
                break;
            } catch (err: unknown) {
                console.warn(`[AI Fallback] Model ${modelName} failed:`, err instanceof Error ? err.message : String(err));
                lastError = err;
                continue;
            }
        }

        if (responseText === null) {
            throw new Error(`All generative models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }

        // Extra cleanup in case the AI still wraps it in markdown despite instructions,
        // but only if it looks like an HTML response
        let cleanedText = responseText.trim();
        if (cleanedText.startsWith('```html') && cleanedText.endsWith('```')) {
            cleanedText = cleanedText.replace(/^```html/i, '').replace(/```$/, '').trim();
        }

        return NextResponse.json({ text: cleanedText, role: 'assistant' });
    } catch (error: unknown) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate content' }, { status: 500 });
    }
}
