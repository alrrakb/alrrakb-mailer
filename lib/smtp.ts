
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
};

export const sendEmail = async ({ to, subject, html, attachments }: any) => {
    try {
        await transporter.sendMail({
            ...mailOptions,
            to,
            subject,
            html,
            attachments
        });
        return true;
    } catch (error) {
        console.error('SMTP Error:', error);
        throw error;
    }
};
