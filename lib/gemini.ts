
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSy_PLACEHOLDER_FOR_BUILD"; // Fallback to prevent build crash

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not defined in environment variables. AI features will fail at runtime.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Priority list of models to try
const MODELS = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-1.0-pro",
    "gemini-pro"
];

export async function generateContent(prompt: string) {
    if (!apiKey) {
        throw new Error("API Key not found");
    }

    let lastError: unknown = null;

    // Try each model in sequence
    for (const modelName of MODELS) {
        try {
            console.log(`Attempting to generate content with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Internal retry loop for transient errors (like 429) on the SAME model
            let attempts = 0;
            const maxRetryPerModel = 2; // Don't wait too long if it's broken

            while (attempts <= maxRetryPerModel) {
                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    if (!text || text.trim().length === 0) {
                        throw new Error(`Empty response from model ${modelName}`);
                    }

                    return text; // Success! Return immediately.
                } catch (err: unknown) {
                    attempts++;

                    const geminiErr = err as { response?: { status: number }, status?: number, message?: string };

                    // If it's a 404 (Not Found), this model isn't available. Break loop to try next model.
                    if (geminiErr.response?.status === 404 || geminiErr.message?.includes('404')) {
                        console.warn(`Model ${modelName} not found (404). Skipping...`);
                        break;
                    }

                    // If it's a 429 (Rate Limit), wait and retry
                    if (geminiErr.response?.status === 429 || geminiErr.status === 429 || geminiErr.message?.includes('429') || geminiErr.message?.includes('quota')) {
                        if (attempts <= maxRetryPerModel) {
                            console.warn(`Model ${modelName} rate limited. Retrying (${attempts}/${maxRetryPerModel})...`);
                            await new Promise(r => setTimeout(r, 2000 * attempts)); // Backoff
                            continue;
                        } else {
                            // Max retries reached for this model, treat as failure and proceed to next model in outer loop
                            console.warn(`Model ${modelName} exhausted retries.`);
                            throw err;
                        }
                    }

                    // Other errors? Throw to outer loop to try next model
                    throw err;
                }
            }

        } catch (error: unknown) {
            lastError = error;
            console.warn(`Failed with model ${modelName}:`, error instanceof Error ? error.message : String(error));
            // Continue to next model in the MODELS list
        }
    }

    // If we get here, ALL models failed
    throw lastError || new Error("All AI models failed to respond.");
}
