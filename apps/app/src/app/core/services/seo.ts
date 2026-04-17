import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { BASE_URL, RESPONSE } from '../constants/tokens';
import { Optional } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Seo {
  private baseTitle = 'JSL Technology';
  private siteName = 'JSL Technology'; // Para Open Graph
  private defaultImageUrl: string;
  private supportedLangs = SUPPORTED_LANGUAGES;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private translate: TranslateService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(BASE_URL) private baseUrl: string,
    @Optional() @Inject(RESPONSE) private response: any
  ) {
    this.defaultImageUrl = `${this.baseUrl}/assets/imgs/jsl-social-default.jpg`;
  }

  /**
   * Devuelve la URL base del sitio.
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  init(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      tap(() => {
        this.setOrganizationSchema();
        this.setResourceHints();
        this.clearDynamicSchemas();
      }),
      map(() => this.getDeepestRoute(this.activatedRoute)),
      filter(route => !!route.snapshot.data['title']),
      switchMap(route => {
        const titleKey = route.snapshot.data['title'];
        let descriptionKey = route.snapshot.data['description'];

        if (titleKey === 'dynamic') {
          return of({ route, translatedTitle: null, translatedDesc: null });
        }

        if (!descriptionKey || descriptionKey === '') {
          descriptionKey = 'COMMON.DEFAULT_DESCRIPTION';
        }

        return this.translate.get([titleKey, descriptionKey]).pipe(
          map(translations => {
            let translatedTitle = translations[titleKey];
            let translatedDesc = translations[descriptionKey];

            // Robust fallback if translation is missing (ngx-translate returns the key)
            if (translatedTitle === titleKey || !translatedTitle) {
              translatedTitle = this.baseTitle;
            }
            if (translatedDesc === descriptionKey || !translatedDesc) {
              translatedDesc = 'Expert software development and digital transformation solutions.';
            }

            return {
              route,
              translatedTitle,
              translatedDesc
            };
          })
        );
      })
    ).subscribe(({ route, translatedTitle, translatedDesc }) => {
      // --- 0. Leer Robots Meta de la Ruta ---
      const robotsConfig = route.snapshot.data['robots'] || 'index, follow';

      // --- G. Handle HTTP Status for Noindex Routes ---
      if (this.response) {
        const fullPath = this.router.url;
        const isNotFound = route.routeConfig?.path === '**' ||
                         fullPath.includes('/not-found') ||
                         route.snapshot.url.some(s => s.path === 'not-found');

        const isServerError = fullPath.includes('/server-error') ||
                            route.snapshot.url.some(s => s.path === 'server-error');

        if (isNotFound) {
          console.log('SEO: Setting status to 404 for', fullPath);
          this.response.status(404);
        } else if (isServerError) {
          console.log('SEO: Setting status to 500 for', fullPath);
          this.response.status(500);
        }
      }

      // Skip if the component handles SEO manually
      if (translatedTitle === null) {
        return;
      }
      
      // --- A. Construir URLs y Título ---
      const title = (translatedTitle === 'Inicio' || translatedTitle === 'Home')
        ? this.baseTitle
        : `${translatedTitle} | ${this.baseTitle}`;
      
      const currentLang = route.parent?.snapshot.params['lang'];
      const pathSegments = route.snapshot.pathFromRoot
        .flatMap(r => r.url.map(segment => segment.path))
        .filter(path => path !== currentLang); // Exclude language segment from path

      const pathWithoutLang = pathSegments.join('/');
      
      // --- B. Lógica de URL Canónica ---
      // (Ej: 'home' se convierte en '', 'solutions' se queda como 'solutions')
      let canonicalPath = pathWithoutLang === 'home' ? '' : pathWithoutLang;

      // Ensure no double slashes and no trailing slash unless it's the root
      canonicalPath = canonicalPath.replace(/\/+$/, '');

      // (Ej: https://www.jsltechnology.com/es ó https://www.jsltechnology.com/es/solutions)
      // Evitamos slash final si canonicalPath está vacío
      const canonicalUrl = canonicalPath
        ? `${this.baseUrl}/${currentLang}/${canonicalPath}`
        : `${this.baseUrl}/${currentLang}`;

      // --- C. Actualizar Título y Meta Descripción ---
      this.titleService.setTitle(title);
      this.metaService.updateTag({ name: 'description', content: translatedDesc });

      // --- D. Actualizar Etiqueta Canónica (¡NUEVO!) ---
      // Esto se ejecuta en servidor y cliente
      this.updateCanonicalTag(canonicalUrl);

      // --- E. Actualizar Etiquetas de Redes Sociales (¡NUEVO!) ---
      // (Asumimos una imagen por defecto, pero podrías hacerla dinámica)
      this.updateSocialTags(
        title, 
        translatedDesc, 
        canonicalUrl, 
        this.defaultImageUrl,
        'website' // Añadimos el tipo por defecto
      );

      // --- F. Update Robots Tag ---
      this.updateRobotsTag(robotsConfig);


      // --- G. Actualizar Etiquetas Hreflang (¡MODIFICADO!) ---
      // Ya no está dentro de 'isPlatformBrowser', se ejecutará en el servidor.
      // La lógica interna se encarga de la limpieza solo en el navegador.
      if (currentLang) {
        this.updateHreflangTags(this.baseUrl, canonicalPath);
        this.updateLanguageTag(currentLang);
      }
    });
  }

  private getDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let currentRoute = route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    return currentRoute;
  }

  /**
   * Actualiza el título y la descripción meta.
   */
  public updateTitleAndDescription(title: string, description: string): void {
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
  }

  /**
   * 3. ¡NUEVO! Actualiza la etiqueta <link rel="canonical">.
   */
  public updateCanonicalTag(url: string): void {
    // Remove ALL existing canonical tags to avoid duplicates during SPA navigation
    const existingCanonicalTags = this.document.querySelectorAll('link[rel="canonical"]');
    existingCanonicalTags.forEach(tag => tag.remove());
    
    // Creamos la nueva etiqueta (esto se ejecuta en servidor y cliente)
    const link: HTMLLinkElement = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  /**
   * 4. ¡NUEVO! Actualiza las etiquetas Meta de Open Graph y Twitter.
   */
  public updateSocialTags(title: string, description: string, url: string, imageUrl: string, ogType = 'website'): void {
    // Open Graph (Facebook, LinkedIn, etc.)
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });
    this.metaService.updateTag({ property: 'og:type', content: ogType });

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  /**
   * 6. ¡NUEVO! Actualiza el atributo lang del html.
   */
  private updateLanguageTag(lang: string): void {
    this.document.documentElement.lang = lang;
  }

  /**
   * 7. ¡NUEVO! Actualiza la etiqueta meta robots.
   */
  public updateRobotsTag(content: string): void {
    this.metaService.updateTag({ name: 'robots', content: content });
  }

  /**
   * 8. ¡NUEVO! Gestiona scripts de Datos Estructurados (JSON-LD).
   */
  public setJsonLd(schema: any, id = 'structured-data'): void {
    const schemaName = id;

    // 8.1. Limpiar script previo (solo navegador para evitar fugas en navegación SPA)
    if (isPlatformBrowser(this.platformId)) {
      const existingScript = this.document.getElementById(schemaName);
      if (existingScript) {
        existingScript.remove();
      }
    }

    // 8.2. Crear y añadir el nuevo script
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = schemaName;
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }

  /**
   * Limpia esquemas dinámicos para evitar que persistan entre rutas.
   */
  public clearDynamicSchemas(): void {
    const dynamicSchemas = ['breadcrumb-schema', 'structured-data'];
    dynamicSchemas.forEach(id => {
      const existingScript = this.document.getElementById(id);
      if (existingScript) {
        existingScript.remove();
      }
    });
  }

  /**
   * Genera e inyecta el esquema de Organización.
   */
  public setOrganizationSchema(): void {
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'JSL Technology',
      'url': this.baseUrl,
      'logo': `${this.baseUrl}/logo.png`,
      'sameAs': [
        'https://www.linkedin.com/company/jsl-technology',
        'https://twitter.com/jsl_technology'
      ],
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+34-900-000-000',
        'contactType': 'customer service',
        'areaServed': 'Global',
        'availableLanguage': ['Spanish', 'English']
      }
    };
    this.setJsonLd(organizationSchema, 'organization-schema');
  }

  /**
   * Inyecta Resource Hints (preconnect, dns-prefetch) para optimizar carga.
   */
  public setResourceHints(): void {
    const domains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    domains.forEach(domain => {
      // Preconnect
      if (!this.document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
        const preconnect = this.document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = domain;
        if (domain.includes('gstatic')) {
          preconnect.setAttribute('crossorigin', '');
        }
        this.document.head.appendChild(preconnect);
      }

      // DNS-prefetch
      if (!this.document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`)) {
        const dnsPrefetch = this.document.createElement('link');
        dnsPrefetch.rel = 'dns-prefetch';
        dnsPrefetch.href = domain;
        this.document.head.appendChild(dnsPrefetch);
      }
    });
  }

  /**
   * Genera e inyecta el esquema de BreadcrumbList.
   */
  public setBreadcrumbs(breadcrumbs: { name: string, item: string }[]): void {
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': breadcrumbs.map((breadcrumb, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': breadcrumb.name,
        'item': breadcrumb.item.startsWith('http') ? breadcrumb.item : `${this.baseUrl}${breadcrumb.item}`
      }))
    };
    this.setJsonLd(breadcrumbSchema, 'breadcrumb-schema');
  }

  /**
   * 5. ¡MODIFICADO! Actualiza las etiquetas hreflang siendo "SSR-safe".
   */
  private updateHreflangTags(baseUrl: string, pathWithoutLang: string): void {
    
    // 5.1. Limpiar etiquetas hreflang antiguas
    const oldTags = this.document.querySelectorAll('link[rel="alternate"]');
    oldTags.forEach(tag => {
      // Only remove if it's a hreflang tag (not a sitemap or other alternate)
      if (tag.hasAttribute('hreflang')) {
        tag.remove();
      }
    });

    // 5.2. Obtener la URL canónica para la ruta (quitando 'home')
    let canonicalPath = pathWithoutLang === 'home' ? '' : pathWithoutLang;
    canonicalPath = canonicalPath.replace(/\/+$/, '');

    // 5.3. Añadir una etiqueta por cada idioma soportado (Se ejecuta en servidor y cliente)
    this.supportedLangs.forEach(lang => {
      const link: HTMLLinkElement = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      const url = canonicalPath ? `${baseUrl}/${lang}/${canonicalPath}` : `${baseUrl}/${lang}`;
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    });

    // 5.4. Añadir la etiqueta 'x-default' (Se ejecuta en servidor y cliente)
    const defaultLink: HTMLLinkElement = this.document.createElement('link');
    defaultLink.setAttribute('rel', 'alternate');
    defaultLink.setAttribute('hreflang', 'x-default');
    const defaultUrl = canonicalPath ? `${baseUrl}/en/${canonicalPath}` : `${baseUrl}/en`;
    defaultLink.setAttribute('href', defaultUrl); // Usamos 'en' como default
    this.document.head.appendChild(defaultLink);
  }
}