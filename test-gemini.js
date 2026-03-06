
/* eslint-disable @typescript-eslint/no-require-imports */
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        // For listing models, we can assume the SDK has a way, but simpler is to try a known working one or just log if we can't.
        // Actually, looking at docs, genAI.getGenerativeModel is the main entry.
        // There isn't a direct helper on genAI instance usually exposed easily in node without model manager?
        // Wait, the error message suggested: "Call ListModels to see the list of available models".
        // I will try to use the raw API if needed, but let's try to just instantiate a model and catch error, 
        // or try 'gemini-1.5-flash-001'.

        // Instead of listing which might be complex if not exposed in high level helper, 
        // let's try a few standard variation model names.

        const modelsToTry = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.0-pro",
            "gemini-pro"
        ];

        for (const modelName of modelsToTry) {
            console.log(`Testing model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello via test script");
                await result.response;
                console.log(`SUCCESS: ${modelName} is working!`);
                return; // Found a working one
            } catch (e) {
                console.log(`FAILED: ${modelName} - ${e.message.split('\n')[0]}`);
            }
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
}

listModels();
