
/* eslint-disable @typescript-eslint/no-require-imports */
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const targetEmail = process.argv[2];

    if (!targetEmail) {
        console.error('Please provide an email address as an argument.');
        console.error('Usage: node scripts/test-smtp.js <email>');
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    console.log('Sending test email to:', targetEmail);
    console.log('Using SMTP Host:', process.env.SMTP_HOST);

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: targetEmail,
            subject: 'Test Email from Marketing Mailer',
            text: 'This is a test email to verify your SMTP configuration.',
            html: '<h1>Success!</h1><p>This is a test email to verify your <b>SMTP configuration</b>.</p>',
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

main().catch(console.error);
