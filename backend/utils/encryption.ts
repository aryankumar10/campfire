import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    throw new Error('FATAL: ENCRYPTION_KEY missing from environment variables');
}
const IV_LENGTH = 16; // For AES, this is always 16

export function encryptMessage(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptMessage(text: string): string {
    try {
        const textParts = text.split(':');
        if (textParts.length < 2) return text; // Probably unencrypted message from before
        const iv = Buffer.from(textParts.shift() as string, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Decryption error, returning original text fallback');
        return text;
    }
}
