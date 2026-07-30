/**
 * Interpolate `{field}` placeholders in text using a vars bag (e.g. the event
 * context), so the same template reads freshly per career ("Il tuo arrivo al
 * {clubName}…"). Unknown or empty fields are dropped and whitespace collapsed.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | boolean>,
): string {
  const rendered = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null || value === '') return '';
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    return '';
  });
  return rendered
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}
