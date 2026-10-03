import { db } from './db';
import { normalizePhone } from './phone';
// The public contact details shown on the Contact page.
export type SiteContact = { phone: string; whatsapp: string; email: string };
export const contactKeys = {
  phone: 'contactPhone',
  whatsapp: 'contactWhatsapp',
  email: 'contactEmail',
} as const;
export function envContact(): SiteContact {
  return {
    phone: process.env.CONTACT_PHONE || '',
    whatsapp: process.env.CONTACT_WHATSAPP || '',
    email: process.env.CONTACT_EMAIL || '',
  };
}
// A detail saved in the settings wins, even when empty (it is then hidden);
// one that was never saved falls back to its environment variable.
export async function siteContact(): Promise<SiteContact> {
  const fallback = envContact();
  const rows = await db.siteSetting.findMany({
    where: { key: { in: Object.values(contactKeys) } },
  });
  const saved = new Map(rows.map((row) => [row.key, row.value]));
  return {
    phone: saved.get(contactKeys.phone) ?? fallback.phone,
    whatsapp: saved.get(contactKeys.whatsapp) ?? fallback.whatsapp,
    email: saved.get(contactKeys.email) ?? fallback.email,
  };
}
// A number as a link target: the international form when it is a Moroccan number.
export function dialable(number: string) {
  try {
    return normalizePhone(number);
  } catch {
    return number.replace(/[^\d+]/g, '');
  }
}
