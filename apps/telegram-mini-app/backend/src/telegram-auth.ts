import crypto from 'node:crypto';

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export function validateTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 86400): TelegramUser {
  if (!initData) throw new Error('Missing Telegram initData');
  if (!botToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing Telegram hash');

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) throw new Error('Invalid auth_date');
  if (Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) throw new Error('Telegram initData expired');

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error('Invalid Telegram signature');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new Error('Missing Telegram user');

  return JSON.parse(userRaw) as TelegramUser;
}
