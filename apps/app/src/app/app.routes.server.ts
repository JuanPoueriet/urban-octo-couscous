import { RenderMode, ServerRoute } from '@angular/ssr';
// 1. NO importamos 'getPrerenderParams'

import { PROJECTS, BLOG_POSTS } from './core/data/mock-data';

const supportedLangs = ['es', 'en'];

export const serverRoutes: ServerRoute[] = [
  // --- RUTAS ESTÁTICAS CORREGIDAS ---
  // 2. Usamos .map() para devolver un array: [{ lang: 'es' }, { lang: 'en' }]
  // 3. Hacemos la función 'async' para que devuelva una Promesa (la forma más robusta)
  {
    path: ':lang',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/solutions',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/products',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/projects',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/blog',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/about-us',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/contact',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/privacy-policy',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },
  {
    path: ':lang/terms-of-service',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => supportedLangs.map(lang => ({ lang })),
  },

  // --- RUTAS DINÁMICAS CORREGIDAS ---
  // 3. Hacemos la función 'async'
  {
    path: ':lang/projects/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => { // <--- async
      const params: { lang: string; slug: string }[] = [];
      for (const lang of supportedLangs) {
        for (const project of PROJECTS) {
          params.push({ lang, slug: project.slug });
        }
      }
      return params;
    },
  },

  {
    path: ':lang/blog/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => { // <--- async
      const params: { lang: string; slug: string }[] = [];
      for (const lang of supportedLangs) {
        for (const post of BLOG_POSTS) {
          params.push({ lang, slug: post.slug });
        }
      }
      return params;
    },
  },
  
  // --- FALLBACK CORREGIDO ---
  // 4. Cambiamos 'Dynamic' por 'SSR'
{
  path: '**',
  renderMode: RenderMode.Server 
}
];