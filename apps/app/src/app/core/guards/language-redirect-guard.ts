import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageRedirectService {
  constructor(
    private router: Router,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  redirect(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const defaultLang = 'en';
      const supportedLangs = this.translate.getLangs();

      // 1. Intentar obtener el idioma desde localStorage (visitas anteriores)
      let storedLang = localStorage.getItem('jsl_lang');

      // 2. Si no está, detectar el idioma del navegador
      if (!storedLang) {
        const browserLang = this.translate.getBrowserLang() || '';
        storedLang = supportedLangs.includes(browserLang)
          ? browserLang
          : defaultLang;
      }

      // 3. Validar que el idioma esté soportado
      const langToUse =
        storedLang && supportedLangs.includes(storedLang)
          ? storedLang
          : defaultLang;

      // Redirigir a la ruta con el idioma, manteniendo la URL limpia
      this.router.navigate([langToUse], { replaceUrl: true });
    }
    // Prevenimos la navegación a la ruta vacía, ya que la redirección se encargará.
    return false;
  }
}

export const languageRedirectGuard: CanActivateFn = () => {
  return inject(LanguageRedirectService).redirect();
};