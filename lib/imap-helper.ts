import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

export class ImapHelper {
    // config is now built dynamically in fetchNewEmails
    constructor() { }

    async fetchNewEmails(email: string, password: string) {
        console.log(`Attempting IMAP connection for: ${email}`);

        const config = {
            imap: {
                user: email,
                password: password,
                host: 'imap.hostinger.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 30000,
            }
        };

        try {
            const connection = await imap.connect(config);
            console.log('IMAP Connected. Opening INBOX...');

            await connection.openBox('INBOX');
            console.log('INBOX Opened. Searching...');

            const searchCriteria = ['UNSEEN'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            console.log(`Found ${messages.length} messages.`);

            const parsedMessages = await Promise.all(messages.map(async (msg: Record<string, unknown>) => {
                const parts = msg.parts as Record<string, unknown>[];
                const all = parts.find((part) => part.which === '');
                const attributes = msg.attributes as { uid: string };
                const id = attributes.uid;
                const body = all ? all.body : '';

                const parsed = await simpleParser(body);

                return {
                    message_id: parsed.messageId || `uid-${id}`,
                    sender: parsed.from?.text || 'Unknown',
                    subject: parsed.subject || 'No Subject',
                    content: parsed.html || parsed.textAsHtml || parsed.text || '',
                    date: parsed.date || new Date(),
                    original_msg: msg
                };
            }));

            connection.end();
            return parsedMessages;
        } catch (error) {
            console.error('IMAP Fetch Error:', error);
            throw error;
        }
    }
}
