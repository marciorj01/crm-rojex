// Pure normalization: no database access and no silent replacement of invalid contacts.
export function normalizeLead(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Objeto JSON esperado');
  const b = body as Record<string, unknown>;
  const contact = b.contact && typeof b.contact === 'object' ? b.contact as Record<string, unknown> : {};
  const text = (value: unknown, max: number) => {
    if (value == null) return '';
    if (typeof value !== 'string' || value.length > max) throw new Error('Campo inválido ou muito longo');
    return value.trim();
  };
  const name = text(b.name ?? b.client_name ?? contact.name, 255);
  const email = text(b.email ?? b.client_email ?? contact.email, 254);
  const phone = text(b.phone ?? b.client_phone ?? contact.phone, 50);
  if (!email && !phone) throw new Error('Informe e-mail ou telefone de contato');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido');
  if (phone && phone.replace(/\D/g,'').length < 10) throw new Error('Telefone inválido');
  return {
    name: name || 'Contato do portal', email, phone,
    message: text(b.message ?? b.lead_message ?? b.notes, 10000),
    listing: text(b.property_id ?? b.listing_id, 100),
    external_id: text(b.lead_id ?? b.external_id, 128) || null,
  };
}
