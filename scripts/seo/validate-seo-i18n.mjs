import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROUTES_FILE = path.resolve('apps/app/src/app/app.routes.ts');
const I18N_DIR = path.resolve('apps/app/src/assets/i18n');
const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ht'];

const TITLE_MIN_LENGTH = 15;
const DESCRIPTION_MIN_LENGTH = 50;

function extractSeoKeys(routesSource) {
  const keyRegex = /(title|description):\s*'([^']+)'/g;
  const titles = new Set();
  const descriptions = new Set();
  let match;

  while ((match = keyRegex.exec(routesSource)) !== null) {
    const [, keyType, key] = match;
    if (key === 'dynamic' || key.trim() === '') continue;
    if (keyType === 'title') {
      titles.add(key);
    } else {
      descriptions.add(key);
    }
  }

  return { titles: [...titles], descriptions: [...descriptions] };
}

function flattenJson(obj, prefix = '', output = {}) {
  Object.entries(obj).forEach(([key, value]) => {
    const dottedKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenJson(value, dottedKey, output);
      return;
    }
    output[dottedKey] = value;
  });
  return output;
}

function validateLength(value, minLength) {
  if (typeof value !== 'string') return false;
  return value.trim().length >= minLength;
}

function collectDuplicates(valuesByKey) {
  const reverseMap = new Map();

  Object.entries(valuesByKey).forEach(([key, rawValue]) => {
    if (typeof rawValue !== 'string') return;
    const normalizedValue = rawValue.trim().toLowerCase();
    if (!normalizedValue) return;
    if (!reverseMap.has(normalizedValue)) {
      reverseMap.set(normalizedValue, []);
    }
    reverseMap.get(normalizedValue).push(key);
  });

  return [...reverseMap.values()].filter((keys) => keys.length > 1);
}

async function main() {
  const routesSource = await readFile(ROUTES_FILE, 'utf8');
  const { titles, descriptions } = extractSeoKeys(routesSource);

  const errors = [];
  const warnings = [];

  for (const lang of SUPPORTED_LANGS) {
    const langFile = path.join(I18N_DIR, `${lang}.json`);
    const langJson = JSON.parse(await readFile(langFile, 'utf8'));
    const flat = flattenJson(langJson);

    const titleValues = {};
    const descriptionValues = {};

    for (const key of titles) {
      const value = flat[key];
      titleValues[key] = value;

      if (typeof value !== 'string' || value === key) {
        errors.push(`[${lang}] Missing SEO title translation for key "${key}"`);
        continue;
      }

      if (!validateLength(value, TITLE_MIN_LENGTH)) {
        warnings.push(`[${lang}] SEO title too short (${value.length} chars) for key "${key}"`);
      }
    }

    for (const key of descriptions) {
      const value = flat[key];
      descriptionValues[key] = value;

      if (typeof value !== 'string' || value === key) {
        errors.push(`[${lang}] Missing SEO description translation for key "${key}"`);
        continue;
      }

      if (!validateLength(value, DESCRIPTION_MIN_LENGTH)) {
        warnings.push(`[${lang}] SEO description too short (${value.length} chars) for key "${key}"`);
      }
    }

    collectDuplicates(titleValues).forEach((keys) => {
      warnings.push(`[${lang}] Duplicate SEO title value used in keys: ${keys.join(', ')}`);
    });
    collectDuplicates(descriptionValues).forEach((keys) => {
      warnings.push(`[${lang}] Duplicate SEO description value used in keys: ${keys.join(', ')}`);
    });
  }

  if (errors.length) {
    console.error('SEO i18n validation failed:');
    errors.forEach((error) => console.error(` - ${error}`));
    process.exit(1);
  }

  if (warnings.length) {
    console.warn('SEO i18n validation warnings:');
    warnings.forEach((warning) => console.warn(` - ${warning}`));
  }

  console.log(`SEO i18n validation passed for ${SUPPORTED_LANGS.length} languages.`);
}

main().catch((error) => {
  console.error(`Unexpected error during SEO i18n validation: ${error.message}`);
  process.exit(1);
});
