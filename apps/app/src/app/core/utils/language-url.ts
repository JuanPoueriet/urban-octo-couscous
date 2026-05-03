export function normalizeLang(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function hasLanguagePrefix(path: string, supportedLangs: readonly string[]): boolean {
  const firstSegment = path.split('/').filter(Boolean)[0] ?? '';
  const normalized = normalizeLang(firstSegment);
  return supportedLangs.map(normalizeLang).includes(normalized);
}

export function buildLocalizedUrl(path: string, lang: string, supportedLangs: readonly string[]): string {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return hasLanguagePrefix(safePath, supportedLangs)
    ? safePath
    : `/${normalizeLang(lang)}${safePath === '/' ? '' : safePath}`;
}
