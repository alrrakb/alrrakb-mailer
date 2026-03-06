// Native fetch is available in Node 18+

const API_URL = 'http://localhost:3000/api/queue/process';
const INTERVAL_MS = 10000; // Run every 10 seconds

console.log(`🚀 Background Worker Started`);
console.log(`   Target: ${API_URL}`);
console.log(`   Interval: ${INTERVAL_MS / 1000}s`);
console.log(`   (Press Ctrl+C to stop)`);

async function runOptions() {
    try {
        const start = Date.now();
        const response = await fetch(API_URL);
        const data = await response.json();
        const duration = Date.now() - start;

        if (data.processed > 0) {
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Processed ${data.processed} emails in ${duration}ms`);
        } else if (data.error) {
            console.error(`[${new Date().toLocaleTimeString()}] ❌ Error:`, data.error);
        } else {
            // Silent for "No pending emails" to avoid clutter, or maybe just a dot
            process.stdout.write('.');
        }
    } catch {
        console.error(`\n[${new Date().toLocaleTimeString()}] ❌ Connection Failed: Is the server running?`);
    }
}

// Initial Run
runOptions();

// Loop
setInterval(runOptions, INTERVAL_MS);
