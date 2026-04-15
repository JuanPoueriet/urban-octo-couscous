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
const angularApp = new AngularNodeAppEngine();

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

/**
 * Genera el XML del sitemap dinámicamente
 */
function generateSitemap(domain: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

  const now = new Date().toISOString().split('T')[0];

  // 1. Añadir rutas estáticas
  staticRoutes.forEach(route => {
    xml += generateUrlEntry(route, now, domain);
  });

  // 2. Añadir rutas dinámicas de Soluciones
  SOLUTIONS.forEach((solution: any) => {
    xml += generateUrlEntry(`solutions/${solution.slug}`, solution.date || now, domain);
  });

  // 3. Añadir rutas dinámicas de Proyectos
  PROJECTS.forEach((project: any) => {
    xml += generateUrlEntry(`projects/${project.slug}`, project.date || now, domain);
  });
  
  // 4. Añadir rutas dinámicas de Blog
  BLOG_POSTS.forEach(post => {
    xml += generateUrlEntry(`blog/${post.slug}`, post.date || now, domain);
  });

  xml += '</urlset>';
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
  const host = req.get('host');
  // Usar dominio canónico en producción para evitar inconsistencias
  const domain = (host && (host.includes('localhost') || host.includes('127.0.0.1')))
    ? `${req.protocol}://${host}`
    : 'https://www.jsl.technology';

  const sitemap = generateSitemap(domain);
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
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

  const host = req.get('host');
  const dynamicBaseUrl = (host && (host.includes('localhost') || host.includes('127.0.0.1')))
    ? `${req.protocol}://${host}`
    : 'https://www.jsl.technology';

  angularApp
    .handle(req, {
      providers: [
        { provide: BASE_URL, useValue: dynamicBaseUrl },
        { provide: RESPONSE, useValue: res },
      ],
      allowedHosts: ['127.0.0.1', 'localhost', '127.0.0.1:4000', 'localhost:4000', host],
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