export function normalizePhone(input: string) {
  const raw = input.replace(/[\s().-]/g, '');
  const phone = raw.startsWith('00212')
    ? `+${raw.slice(2)}`
    : raw.startsWith('212')
      ? `+${raw}`
      : raw.startsWith('0')
        ? `+212${raw.slice(1)}`
        : raw;
  if (!/^\+212[5-7]\d{8}$/.test(phone))
    throw new Error('Saisissez un numéro marocain valide (ex. 0612345678).');
  return phone;
}
