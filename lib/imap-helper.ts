import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

// Hostinger/cPanel IMAP mailbox names → our DB folder enum.
// Covers standard RFC names and cPanel's hierarchical "INBOX.XXX" variants.
export const IMAP_MAILBOX_MAP: Record<string, string> = {
    // Inbox
    'INBOX': 'inbox',

    // Sent — Hostinger uses 'Sent' or hierarchical 'INBOX.Sent'
    'Sent': 'sent',
    'Sent Items': 'sent',
    'INBOX.Sent': 'sent',
    'INBOX.Sent Items': 'sent',

    // Spam / Junk
    'Junk': 'spam',
    'Junk E-mail': 'spam',
    'Junk Email': 'spam',
    'Spam': 'spam',
    'INBOX.Junk': 'spam',
    'INBOX.Spam': 'spam',

    // Trash / Deleted
    'Trash': 'trash',
    'Deleted': 'trash',
    'Deleted Items': 'trash',
    'Deleted Messages': 'trash',
    'INBOX.Trash': 'trash',
    'INBOX.Deleted': 'trash',
};

/**
 * Converts any IMAP server mailbox name to our DB folder enum value.
 * Tries exact map lookup first, then case-insensitive substring matching as a fallback.
 */
export function mapBoxToFolder(boxName: string): string {
    if (IMAP_MAILBOX_MAP[boxName]) return IMAP_MAILBOX_MAP[boxName];
    const lower = boxName.toLowerCase();
    if (lower.includes('sent')) return 'sent';
    if (lower.includes('junk') || lower.includes('spam')) return 'spam';
    if (lower.includes('trash') || lower.includes('delet')) return 'trash';
    return 'inbox'; // unknown mailbox — safe fallback
}

export type ParsedEmail = {
    message_id: string;
    sender: string;
    subject: string;
    content: string;
    date: Date;
    folder: string;
};

export class ImapHelper {
    constructor() { }

    async fetchAllFolders(email: string, password: string): Promise<ParsedEmail[]> {
        console.log(`[IMAP] Connecting for: ${email}`);

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

        const connection = await imap.connect(config);
        console.log('[IMAP] Connected.');

        // Build the IMAP-standard date string: DD-Mon-YYYY
        const IMAP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 45); // 45 days — captures mid-February history
        const imapSinceStr = `${String(sinceDate.getDate()).padStart(2, '0')}-${IMAP_MONTHS[sinceDate.getMonth()]}-${sinceDate.getFullYear()}`;

        const searchCriteria = ['ALL', ['SINCE', imapSinceStr]];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: false };

        const allParsed: ParsedEmail[] = [];

        // Iterate over each target mailbox — use Object.keys so we still iterate only known boxes
        for (const mailboxName of Object.keys(IMAP_MAILBOX_MAP)) {
            // Resolve folder using the helper so substring fallback is always available
            const folderLabel = mapBoxToFolder(mailboxName);

            try {
                await connection.openBox(mailboxName, true);
            } catch {
                // Mailbox doesn't exist on this server — skip silently
                console.log(`[IMAP] Mailbox "${mailboxName}" not found — skipping.`);
                continue;
            }

            console.log(`[IMAP] Opened "${mailboxName}" → folder="${folderLabel}". Searching SINCE ${imapSinceStr}...`);

            let messages;
            try {
                const all = await connection.search(searchCriteria, fetchOptions);
                // Newest first, capped at 50 per folder
                messages = all
                    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
                        (b.attributes as { uid: number }).uid - (a.attributes as { uid: number }).uid
                    )
                    .slice(0, 50);
            } catch {
                console.warn(`[IMAP] Search failed in "${mailboxName}" — skipping.`);
                continue;
            }

            console.log(`[IMAP] Found ${messages.length} messages in "${mailboxName}".`);

            const parsed = await Promise.all(
                messages.map(async (msg: Record<string, unknown>) => {
                    const parts = msg.parts as Record<string, unknown>[];
                    const all = parts.find((p) => p.which === '');
                    const attributes = msg.attributes as { uid: number };
                    const body = all ? (all.body as string) : '';

                    const parsed = await simpleParser(body);

                    // ── Bounce Detection ────────────────────────────────────────────────
                    // Check sender text AND subject against all known delivery-failure
                    // keywords. Unified list so adding a new pattern only requires one edit.
                    const senderText = (parsed.from?.text || '').toLowerCase();
                    const subjectText = (parsed.subject || '').toLowerCase();
                    const combined = `${senderText} ${subjectText}`;

                    const BOUNCE_PATTERNS = [
                        'mailer-daemon',
                        'postmaster',
                        'mail delivery',          // covers "mail delivery subsystem/system/failed"
                        'undeliverable',
                        'delivery status',
                        'delivery failure',
                        'returned mail',
                        'failure notice',
                        'message not delivered',
                        'noreply+bounce',
                    ];

                    const isBounced = BOUNCE_PATTERNS.some(p => combined.includes(p));
                    const resolvedFolder = isBounced ? 'bounced' : folderLabel;

                    if (isBounced) {
                        console.log(`[IMAP] Bounce detected — overriding folder to 'bounced' for: "${parsed.subject}"`);
                    }

                    return {
                        message_id: parsed.messageId || `uid-${attributes.uid}-${mailboxName}`,
                        sender: parsed.from?.text || 'Unknown',
                        subject: parsed.subject || 'No Subject',
                        content: parsed.html || parsed.textAsHtml || parsed.text || '',
                        date: parsed.date || new Date(),
                        folder: resolvedFolder,
                    } as ParsedEmail;
                })
            );

            allParsed.push(...parsed);
        }

        connection.end();
        console.log(`[IMAP] Sync complete. Total messages fetched: ${allParsed.length}`);
        return allParsed;
    }

    // Legacy single-inbox fetch for backwards compatibility
    async fetchNewEmails(email: string, password: string): Promise<ParsedEmail[]> {
        return this.fetchAllFolders(email, password);
    }
}
