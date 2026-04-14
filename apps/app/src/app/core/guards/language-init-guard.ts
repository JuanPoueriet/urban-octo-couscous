import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
// --- 1. IMPORTAR DOCUMENT ---
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageInitService {
  constructor(
    private translate: TranslateService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    // --- 2. INYECTAR DOCUMENT ---
    @Inject(DOCUMENT) private document: Document
  ) {}

  initLanguage(route: ActivatedRouteSnapshot): boolean {
    const lang = route.params['lang'];
    const supportedLangs = this.translate.getLangs();

    if (supportedLangs.includes(lang)) {
      // 1. Activar el idioma en ngx-translate (Se ejecuta en servidor y cliente)
      this.translate.use(lang);

      // --- 3. ACTUALIZAR <html lang=""> (Se ejecuta en servidor y cliente) ---
      // Esto es crucial para la accesibilidad y el SEO en la carga inicial.
      this.document.documentElement.lang = lang;

      if (isPlatformBrowser(this.platformId)) {
        // 2. Guardar la preferencia en localStorage (Solo se ejecuta en el cliente)
        localStorage.setItem('jsl_lang', lang);
      }
      return true; // Permitir el acceso a la ruta
    } else {
      // Si el idioma en la URL no es válido (p.ej. /fr/home)
      // Redirigir a la versión 'es' de la misma ruta para evitar errores
      const urlSegments = route.url.map(segment => segment.path);
      // Nota: En un entorno de servidor, 'navigate' puede necesitar configuración adicional
      // para emitir un redirect 301, pero para la lógica de la app esto es correcto.
      this.router.navigate(['es', ...urlSegments], { replaceUrl: true });
      return false;
    }
  }
}

export const languageInitGuard: CanActivateFn = (route) => {
  return inject(LanguageInitService).initLanguage(route);
};