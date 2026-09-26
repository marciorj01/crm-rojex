import 'server-only';

export function feedContact() {
  return {
    name: process.env.FEED_CONTACT_NAME || '', email: process.env.FEED_CONTACT_EMAIL || '',
    phone: process.env.FEED_CONTACT_PHONE || '', website: process.env.FEED_CONTACT_WEBSITE || undefined,
  };
}
