import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, switchMap } from 'rxjs/operators';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { BASE_URL } from '../constants/tokens';

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
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(BASE_URL) private baseUrl: string
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
      map(() => this.getDeepestRoute(this.activatedRoute)),
      filter(route => !!route.snapshot.data['title']),
      switchMap(route => {
        const titleKey = route.snapshot.data['title'];
        let descriptionKey = route.snapshot.data['description'];

        if (!descriptionKey || descriptionKey === '') {
          descriptionKey = 'COMMON.DEFAULT_DESCRIPTION';
        }

        return this.translate.get([titleKey, descriptionKey]).pipe(
          map(translations => ({
            route,
            translatedTitle: translations[titleKey],
            translatedDesc: translations[descriptionKey]
          }))
        );
      })
    ).subscribe(({ route, translatedTitle, translatedDesc }) => {
      // --- 0. Leer Robots Meta de la Ruta ---
      const robotsConfig = route.snapshot.data['robots'] || 'index, follow';
      
      // --- A. Construir URLs y Título ---
      const title = (translatedTitle === 'Inicio' || translatedTitle === 'Home')
        ? this.baseTitle
        : `${translatedTitle} | ${this.baseTitle}`;
      
      const currentLang = route.parent?.snapshot.params['lang'];
      const pathWithoutLang = route.snapshot.url.map(segment => segment.path).join('/');
      
      // --- B. Lógica de URL Canónica ---
      // (Ej: 'home' se convierte en '', 'solutions' se queda como 'solutions')
      const canonicalPath = pathWithoutLang === 'home' ? '' : pathWithoutLang;
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
   * 3. ¡NUEVO! Actualiza la etiqueta <link rel="canonical">.
   */
  public updateCanonicalTag(url: string): void {
    // En el navegador, primero eliminamos la etiqueta canónica anterior
    // para evitar duplicados durante la navegación SPA.
    if (isPlatformBrowser(this.platformId)) {
      const oldTag = this.document.querySelector('link[rel="canonical"]');
      if (oldTag) {
        oldTag.remove();
      }
    }
    
    // Creamos la nueva etiqueta (esto se ejecuta en servidor y cliente)
    const link: HTMLLinkElement = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  /**
   * 4. ¡NUEVO! Actualiza las etiquetas Meta de Open Graph y Twitter.
   */
  public updateSocialTags(title: string, description: string, url: string, imageUrl: string, ogType: string = 'website'): void {
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
  public setJsonLd(schema: any): void {
    const schemaName = 'structured-data';

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
   * 5. ¡MODIFICADO! Actualiza las etiquetas hreflang siendo "SSR-safe".
   */
  private updateHreflangTags(baseUrl: string, pathWithoutLang: string): void {
    
    // 5.1. Limpiar etiquetas hreflang antiguas (SOLO en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      const oldTags = this.document.querySelectorAll('link[rel="alternate"]');
      oldTags.forEach(tag => tag.remove());
    }

    // 5.2. Obtener la URL canónica para la ruta (quitando 'home')
    const canonicalPath = pathWithoutLang === 'home' ? '' : pathWithoutLang;

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
    const defaultUrl = canonicalPath ? `${baseUrl}/es/${canonicalPath}` : `${baseUrl}/es`;
    defaultLink.setAttribute('href', defaultUrl); // Usamos 'es' como default
    this.document.head.appendChild(defaultLink);
  }
}