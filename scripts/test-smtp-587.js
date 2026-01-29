
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function main() {
    // Hardcoded test config for Port 587
    const config = {
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    };

    console.log('Testing SMTP Connection with Port 587...');
    console.log('Host:', config.host);
    console.log('User:', config.auth.user);

    const transporter = nodemailer.createTransport(config);

    try {
        await transporter.verify();
        console.log('✅ Connection Successful on Port 587!');
    } catch (error) {
        console.error('❌ Error connecting on Port 587:', error.message);
    }
}

main().catch(console.error);
