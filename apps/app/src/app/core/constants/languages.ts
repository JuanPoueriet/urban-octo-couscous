export const SUPPORTED_LANGUAGES: string[] = [
  'en',
  'es',
  'ar',
  'de',
  'fr',
  'it',
  'ja',
  'ko',
  'pt',
  'zh',
  'ht',
];

/**
 * Keep RTL languages centralized so all services/components share
 * the exact same source of truth.
 */
export const RTL_LANGUAGES: readonly string[] = ['ar'];

export function isRtlLanguage(lang: string | null | undefined): boolean {
  if (!lang) {
    return false;
  }

  return RTL_LANGUAGES.includes(lang);
}
