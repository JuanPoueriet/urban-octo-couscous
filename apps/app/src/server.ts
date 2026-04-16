import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// --- AÑADIDO: Importar los datos para el sitemap dinámico ---
import { PROJECTS, BLOG_POSTS, SOLUTIONS } from './app/core/data/mock-data';
import { SUPPORTED_LANGUAGES } from './app/core/constants/languages';
import { BASE_URL, RESPONSE } from './app/core/constants/tokens';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({ allowedHosts: ["127.0.0.1", "localhost", "www.jsl.technology", "jsl.technology"] });

type SeoHealthSnapshot = {
  generatedAt: string;
  canonicalBaseUrl: string;
  indexedRouteCount: number;
  localeCount: number;
  sitemapEntryCount: number;
  noindexRoutes: string[];
};

let latestSeoHealthSnapshot: SeoHealthSnapshot | null = null;

const CANONICAL_BASE_URL = (process.env['CANONICAL_BASE_URL'] ?? 'https://www.jsl.technology').replace(/\/+$/, '');
const CANONICAL_HOSTS = new Set(
  (process.env['CANONICAL_HOSTS'] ?? 'www.jsl.technology,jsl.technology')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean),
);

// --- OPTIMIZACIÓN: Compresión Gzip/Brotli ---
app.use(compression());

// --- SEGURIDAD: Rate Limiting ---
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10000, // Límite aumentado significativamente para permitir tests E2E paralelos sin bloqueos 429
	standardHeaders: true, // Devuelve info en cabeceras `RateLimit-*`
	legacyHeaders: false, // Deshabilita cabeceras `X-RateLimit-*`
});
// Aplicar rate limiting a todas las rutas
app.use(limiter);

app.get('/', (req, res) => {
  const supportedLangs = SUPPORTED_LANGUAGES;
  const defaultLang = 'en';

  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    // Procesa el header 'Accept-Language' para encontrar el mejor idioma
    const langs = acceptLanguage.split(',').map(lang => {
      const parts = lang.trim().split(';');
      return { code: parts[0].split('-')[0], q: parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0 };
    });

    // Ordena por 'quality value' (q)
    langs.sort((a, b) => b.q - a.q);

    // Encuentra el primer idioma soportado
    for (const lang of langs) {
      if (supportedLangs.includes(lang.code)) {
        res.redirect(301, `/${lang.code}`);
        return;
      }
    }
  }

  // Si no hay header o no hay coincidencia, redirige al idioma por defecto
  res.redirect(301, `/${defaultLang}`);
});



// --- INICIO: Funciones para generar el Sitemap ---

// Lista de rutas públicas estáticas
const staticRoutes = [
  '', // Para home
  'solutions',
  'products',
  'projects', // Página índice de proyectos
  'blog',     // Página índice de blog
  'ventures',
  'investors',
  'virteex-ecosystem',
  'process',
  'industries',
  'tech-stack',
  'about-us',
  'contact',
  'privacy-policy',
  'terms-of-service',
  'cookie-policy',
  'careers',
  'faq',
  'partners',
  'news',
  'developers',
  'roadmap',
  'events',
  'life-at-jsl',
  'press',
  'pricing',
  'security'
];

const supportedLangs = SUPPORTED_LANGUAGES;
const defaultLang = 'en';

// --- NUEVO: Fecha de última modificación para rutas estáticas (evita fluctuaciones de crawl budget) ---
const STATIC_LASTMOD = '2025-10-30';
const NOINDEX_ROUTES = ['/status', '/thank-you', '/server-error', '/not-found'];

/**
 * Genera el XML del sitemap dinámicamente.
 * Refactorizado para mayor escalabilidad y modularidad.
 */
function generateSitemap(domain: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

  const now = new Date().toISOString().split('T')[0];

  // 1. Rutas estáticas
  xml += generateStaticEntriesXml(domain);

  // 2. Rutas dinámicas (Soluciones, Proyectos, Blog)
  xml += generateDynamicEntriesXml('solutions', SOLUTIONS, domain, now);
  xml += generateDynamicEntriesXml('projects', PROJECTS, domain, now);
  xml += generateDynamicEntriesXml('blog', BLOG_POSTS, domain, now);

  xml += '</urlset>';

  latestSeoHealthSnapshot = {
    generatedAt: new Date().toISOString(),
    canonicalBaseUrl: domain,
    indexedRouteCount: staticRoutes.length + SOLUTIONS.length + PROJECTS.length + BLOG_POSTS.length,
    localeCount: supportedLangs.length,
    sitemapEntryCount: (staticRoutes.length + SOLUTIONS.length + PROJECTS.length + BLOG_POSTS.length) * supportedLangs.length,
    noindexRoutes: NOINDEX_ROUTES,
  };

  return xml;
}

/**
 * Genera las entradas XML para las rutas estáticas
 */
function generateStaticEntriesXml(domain: string): string {
  let xml = '';
  staticRoutes.forEach(route => {
    xml += generateUrlEntry(route, STATIC_LASTMOD, domain);
  });
  return xml;
}

/**
 * Genera las entradas XML para rutas dinámicas basadas en una colección
 */
function generateDynamicEntriesXml(basePath: string, collection: any[], domain: string, fallbackDate: string): string {
  let xml = '';
  collection.forEach(item => {
    xml += generateUrlEntry(`${basePath}/${item.slug}`, item.date || fallbackDate, domain);
  });
  return xml;
}

/**
 * Helper para generar una entrada <url> con sus <xhtml:link>
 */
function generateUrlEntry(route: string, lastmod: string, domain: string): string {
  let entryXml = '';
  
  supportedLangs.forEach(lang => {
    const url = `${domain}/${lang}${route ? '/' + route : ''}`;

    entryXml += '<url>';
    entryXml += `<loc>${url}</loc>`;
    entryXml += `<lastmod>${lastmod}</lastmod>`;

    // Añadir las alternativas hreflang
    supportedLangs.forEach(altLang => {
      const altUrl = `${domain}/${altLang}${route ? '/' + route : ''}`;
      entryXml += `<xhtml:link rel="alternate" hreflang="${altLang}" href="${altUrl}" />`;
    });

    // Añadir el x-default
    const defaultUrl = `${domain}/${defaultLang}${route ? '/' + route : ''}`;
    entryXml += `<xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}" />`;

    entryXml += '</url>';
  });
  
  return entryXml;
}
// --- FIN: Funciones para generar el Sitemap ---








/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 * // Handle API request
 * });
 * ```
 */


app.get('/sitemap.xml', (req, res) => {
  const domain = resolveCanonicalBaseUrl(req);

  const sitemap = generateSitemap(domain);
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});

app.get('/seo/health', (req, res) => {
  const canonicalBaseUrl = resolveCanonicalBaseUrl(req);
  if (!latestSeoHealthSnapshot) {
    latestSeoHealthSnapshot = {
      generatedAt: new Date(0).toISOString(),
      canonicalBaseUrl,
      indexedRouteCount: staticRoutes.length + SOLUTIONS.length + PROJECTS.length + BLOG_POSTS.length,
      localeCount: supportedLangs.length,
      sitemapEntryCount: 0,
      noindexRoutes: NOINDEX_ROUTES,
    };
  }

  res.json({
    status: 'ok',
    ...latestSeoHealthSnapshot,
    canonicalHostPolicy: {
      canonicalBaseUrl: CANONICAL_BASE_URL,
      allowedHosts: Array.from(CANONICAL_HOSTS),
    },
  });
});


/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  // --- AÑADIDO: Cabeceras de Seguridad ---
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // --- FIN AÑADIDO ---

  const dynamicBaseUrl = resolveCanonicalBaseUrl(req);
  const requestHost = req.get('host');
  const allowedHosts = ["127.0.0.1", "localhost", "127.0.0.1:4000", "localhost:4000", "127.0.0.1:4100", "localhost:4100", "www.jsl.technology", "jsl.technology"];
  if (requestHost && !allowedHosts.includes(requestHost)) allowedHosts.push(requestHost);

  angularApp
    .handle(req, {
      providers: [
        { provide: BASE_URL, useValue: dynamicBaseUrl },
        { provide: RESPONSE, useValue: res },
      ],
      allowedHosts,
    })
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

function resolveCanonicalBaseUrl(req: express.Request): string {
  const host = req.get('host')?.toLowerCase() ?? '';
  const forwardedProto = req.get('x-forwarded-proto');
  const requestProtocol = forwardedProto?.split(',')[0]?.trim() || req.protocol || 'https';
  const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');

  if (isLocalHost && host) {
    return `${requestProtocol}://${host}`;
  }

  if (!host) {
    return CANONICAL_BASE_URL;
  }

  if (CANONICAL_HOSTS.has(host)) {
    return CANONICAL_BASE_URL;
  }

  return CANONICAL_BASE_URL;
}
