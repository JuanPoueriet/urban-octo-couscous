# Análisis Exhaustivo: Menú Lateral (Mobile Menu)
**Fecha:** 2026-05-08
**Archivos analizados:** 13 archivos del componente + 2 servicios de core

---

## ARCHIVOS ANALIZADOS

- `mobile-menu.ts` (530 líneas) — Componente principal
- `mobile-menu.html` (177 líneas) — Template
- `mobile-menu.scss` (713 líneas) — Estilos
- `mobile-menu.constants.ts` (135 líneas) — Constantes e interfaces
- `mobile-menu-gestures.ts` (841 líneas) — Lógica de gestos táctiles
- `drawer-transition-coordinator.ts` (166 líneas) — FSM de animación
- `mobile-menu-accessibility.ts` (184 líneas) — Gestión de foco y a11y
- `mobile-menu-search.controller.ts` (99 líneas) — Controlador de búsqueda
- `mobile-menu-section.ts` (99 líneas) — Componente de sección/acordeón
- `mobile-menu-quick-access.ts` (55 líneas) — Acceso rápido
- `mobile-menu-search.ts` (52 líneas) — Input de búsqueda
- `menu.service.ts` (39 líneas) — Servicio de estado
- `gesture-bus.service.ts` (112 líneas) — Bus de eventos de gestos

---

## SECCIÓN 1: BUGS Y ERRORES

### BUG-01 — Contradicción aria-hidden + tabindex en focus sentinels
**Archivo:** `mobile-menu.html`, líneas 26-31 y 170-175

```html
<button
  class="sr-only focus-sentinel"
  (focus)="onSentinelFocus($event, 'start')"
  aria-hidden="true"      <!-- PROBLEMA: oculto para a11y -->
  tabindex="0"            <!-- PROBLEMA: pero recibe foco con Tab -->
></button>
```

`aria-hidden="true"` elimina el elemento del árbol de accesibilidad, pero `tabindex="0"` lo mantiene alcanzable con Tab. Esto crea comportamiento indefinido en screen readers: el elemento existe en el árbol de navegación por Tab pero es invisible para el AT. La intención era que los sentinels sean "invisibles" pero funcionales — la implementación correcta es NO poner `aria-hidden` si el elemento es interactivo, o usar `tabindex="-1"` si debe ser programáticamente enfocable pero no tab-focusable. El mismo error aparece en el sentinel del final (líneas 170-175).

**Impacto:** Alto — comportamiento inconsistente con screen readers (NVDA, JAWS, VoiceOver).

---

### BUG-02 — Cast forzado `as string[]` oculta potencial error de tipos
**Archivo:** `mobile-menu.ts`, línea 482

```typescript
this.router.navigate(route as string[]).then(...)
```

La interfaz `InternalMenuLink` define `route: (string | number)[]`, permitiendo segmentos numéricos. El cast elimina esa posibilidad sin validación. Si alguna ruta llegara a tener un número, Angular Router lo convertiría a string silenciosamente, pero el cast puede ocultar un bug si en el futuro se añaden rutas con parámetros numéricos explícitos. La firma correcta sería pasar `route` directamente o convertir con `.map(String)`.

**Impacto:** Bajo actualmente, riesgo medio a largo plazo.

---

### BUG-03 — Race condition en `completeTransition` con gestos rápidos
**Archivo:** `drawer-transition-coordinator.ts`, líneas 154-160

```typescript
private completeTransition(targetState: DrawerState, callback?: () => void): void {
  if (this._currentState !== DrawerState.OPENING && this._currentState !== DrawerState.CLOSING) return;
  // ...
}
```

El guard verifica el estado en el momento de ejecución, pero el fallback timer (`setTimeout`) puede ejecutarse después de que múltiples transiciones hayan ocurrido. Escenario:
1. CLOSED → OPENING (timer A programado a 500ms)
2. Usuario arrastra → DRAGGING (timer A sigue activo)
3. Usuario suelta → OPENING de nuevo (timer B programado)
4. Timer A expira: `_currentState` es OPENING, completa a OPEN → ¡estado incorrecto!

`clearTransitionListeners()` sí se llama en `DRAGGING`, pero si el DRAGGING ocurre entre dos OPENING, el timer del segundo OPENING puede ser cancelado por el `clearTransitionListeners()` del DRAGGING y no re-programado correctamente.

**Impacto:** Medio — visible como drawer que queda "congelado" tras gestos rápidos.

---

### BUG-04 — Inconsistencia de marca en URLs: "virtex" vs "virteex"
**Archivo:** `mobile-menu.constants.ts`, líneas 89-93 y 129

```typescript
// Producto ERP → virtex.com (sin doble 'e')
{ key: 'PRODUCTS_LIST.ERP', href: 'https://virtex.com', icon: 'ExternalLink' },

// Ruta interna → virteex-ecosystem (con doble 'e')
{ key: 'HEADER.VIRTEEX_ECOSYSTEM', route: [currentLang, 'virteex-ecosystem'], icon: 'Layers' },

// Login → app.virtex.com (sin doble 'e')
{ key: 'HEADER.LOGIN_VIRTEEX', href: 'https://app.virtex.com', icon: 'ExternalLink' },
```

Hay tres referencias al mismo producto con dos ortografías distintas. La clave i18n `HEADER.LOGIN_VIRTEEX` usa "VIRTEEX" (con doble 'e') pero apunta a `app.virtex.com` (con una 'e'). Esto puede resultar en URLs rotas si el dominio real usa doble 'e'.

**Impacto:** Alto — posibles links rotos para usuarios.

---

### BUG-05 — `handleEdgeSwipeCancel` llama `onClose()` aunque el menú ya estaba cerrado
**Archivo:** `mobile-menu-gestures.ts`, líneas 803-813

```typescript
private handleEdgeSwipeCancel(event: PointerEvent): void {
  if (event.pointerId !== this.activePointerId) return;
  const menuWidth = this.sessionMenuWidth;
  const closedPos = this.sessionIsRtl ? menuWidth : -menuWidth;
  this.resetDragState();
  this.config.onUpdateTranslate(closedPos, null);
  this.config.onClose();   // ← siempre llama onClose aunque el menú nunca abrió
  // ...
}
```

Durante un edge-swipe que es cancelado (p.ej., por cambio de orientación), el menú nunca llegó a abrirse, pero `onClose()` es llamado de todas formas. Esto triggeraría `menuService.close('gesture')`, actualizando el signal de estado y potencialmente causando efectos secundarios en el efecto reactivo de `mobile-menu.ts`.

**Impacto:** Medio — puede causar parpadeos en el overlay o doble dispatch de analytics.

---

## SECCIÓN 2: INCONSISTENCIAS

### INCONS-01 — URL hardcodeada en template vs URLs centralizadas en constants
**Archivo:** `mobile-menu-quick-access.ts`, línea 38

```typescript
href="https://support.jsl.technology"
```

Mientras que `mobile-menu.constants.ts` centraliza todas las URLs externas en `SOCIAL_LINKS` y en las secciones del menú, `MobileMenuQuickAccess` tiene una URL directamente en el template. Si la URL cambia, hay que buscarla en el template en lugar de en el archivo de constantes.

---

### INCONS-02 — Iconos duplicados para conceptos distintos
**Archivo:** `mobile-menu.constants.ts`, líneas 100 y 104

```typescript
{ key: 'HEADER.ABOUT',    route: [...], icon: 'Users' },
{ key: 'HEADER.PARTNERS', route: [...], icon: 'Users' },
```

`About` y `Partners` usan el mismo icono `'Users'`. Visualmente son indistinguibles en el menú. Candidatos más semánticos: `Info` para About, `Handshake` para Partners.

---

### INCONS-03 — Indentación inconsistente en el template HTML
**Archivo:** `mobile-menu.html`, líneas 25-33

Los focus sentinels y el `<h2>` dentro de `#menuElement` no están indentados al nivel hijo correcto (falta un nivel de indentación de 2 o 4 espacios), mientras que el resto del contenido sí lo está. Esto dificulta la lectura del árbol DOM.

---

### INCONS-04 — `MobileMenuAccessibility` no tiene método `destroy()` completo
**Archivo:** `mobile-menu-accessibility.ts`

`stopObserving()` limpia el observer y el timer, pero no nulifica `lastFocusedElement` ni `focusableElements`. `mobile-menu.ts` llama `this.a11y.stopObserving()` en `cleanup()` pero las referencias a elementos DOM quedan vivas. Contrástese con `DrawerTransitionCoordinator` que tiene un método `destroy()` dedicado.

---

### INCONS-05 — `clearTransitionListeners()` es público sin justificación
**Archivo:** `drawer-transition-coordinator.ts`, línea 106

```typescript
public clearTransitionListeners(): void { ... }
```

Este método solo es llamado internamente (desde `transitionTo()`, `handleTransitionEnd()`, y `destroy()`). No hay ninguna llamada externa en el codebase. Debería ser `private`.

---

### INCONS-06 — Template inline en `MobileMenuSection` vs archivos separados en otros componentes
**Archivo:** `mobile-menu-section.ts`, líneas 21-75

El componente tiene 75 líneas de template inline con lógica compleja (`@for`, `@if`, atributos ARIA dinámicos). Todos los otros componentes del proyecto usan `templateUrl` con archivos `.html` separados. Esta inconsistencia dificulta el mantenimiento.

---

## SECCIÓN 3: MALAS PRÁCTICAS

### MALA-01 — `ViewEncapsulation.None` en componentes con estilos extensos
**Archivos:** `mobile-menu.ts` (línea 70), `mobile-menu-section.ts` (línea 19), `mobile-menu-quick-access.ts` (línea 17), `mobile-menu-search.ts` (línea 17)

Todos los componentes del menú usan `ViewEncapsulation.None`, exponiendo sus estilos globalmente. Aunque el SCSS principal está namespaced bajo `.mobile-menu-container`, los sub-componentes no tienen un wrapper de namespace explícito. Clases como `.accordion-header`, `.mobile-links-list`, `.clear-search` son potenciales colisiones con otros módulos. La recomendación es usar `ViewEncapsulation.Emulated` (el default) o al menos garantizar el namespacing completo.

---

### MALA-02 — Uso de `as any` en código de producción
**Archivo:** `mobile-menu-accessibility.ts`, línea 47

```typescript
const isDisabled = (el as any).disabled === true;
```

El cast `as any` destruye la seguridad de tipos. La solución correcta es usar una type guard o una intersección de tipos:

```typescript
const isDisabled = 'disabled' in el && (el as HTMLButtonElement).disabled === true;
```

---

### MALA-03 — Componente con 12 dependencias inyectadas (violación SRP)
**Archivo:** `mobile-menu.ts`, líneas 73-86

El componente `MobileMenu` inyecta: `DirectionService`, `MenuService`, `OverlayManagerService`, `BreakpointService`, `AnalyticsService`, `GestureBusService`, `TranslateService`, `ElementRef`, `Renderer2`, `NgZone`, `ChangeDetectorRef`, `DestroyRef`, `Router`, `PLATFORM_ID`, y `MobileMenuSearchController`. Son 15 dependencias. Esto es una señal clara de que el componente tiene demasiadas responsabilidades. Los aspectos de analytics y navegación podrían delegarse a servicios o helpers más especializados.

---

### MALA-04 — `transition: all` en SCSS (antipatrón de performance)
**Archivo:** `mobile-menu.scss`, múltiples lugares (líneas 130, 283, 351, 411, 449, 569, 625)

```scss
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

`transition: all` es un antipatrón conocido: anima TODAS las propiedades CSS incluyendo layout properties como `width`, `height`, `padding`, que pueden causar repaints costosos. Debe especificarse qué propiedades se animan:

```scss
transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease;
```

---

### MALA-05 — Caché de traducción crece indefinidamente
**Archivo:** `mobile-menu-search.controller.ts`, líneas 73-81

```typescript
private translationCache = new Map<string, string>();
```

La clave del caché incluye el idioma (`${lang}:${key}`), por lo que cada cambio de idioma añade entradas nuevas sin eliminar las antiguas. Con 11 idiomas y ~40 claves de menú, el caché puede acumular ~440 entradas. Se limpia al llamar `setMenuSections()`, pero si el patrón de uso cambia, esto puede ser una fuga de memoria silenciosa.

---

### MALA-06 — `MobileMenuGestures` es una clase plana que recibe dependencias Angular
**Archivo:** `mobile-menu-gestures.ts`, líneas 138-144

```typescript
constructor(
  private config: MobileMenuGestureConfig,
  private ngZone: NgZone,
  private gestureBus: GestureBusService
)
```

La clase recibe `NgZone` y `GestureBusService` (servicios Angular) pero no es un `@Injectable`. Esto hace el testing más difícil (no se puede usar `TestBed`) y viola el patrón de DI de Angular. Debería ser un servicio Angular con `@Injectable()` o al menos las dependencias deberían pasar por una interfaz.

---

### MALA-07 — El `ResizeObserver` no corre fuera de la Angular zone
**Archivo:** `mobile-menu.ts`, líneas 282-290

```typescript
this.resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    if (entry.target === this.menuElement) {
      this.ngZone.run(() => this.updateMenuWidth());  // zona correcta
    }
  }
});
```

El callback del `ResizeObserver` no está envuelto en `ngZone.runOutsideAngular()`. Aunque `ngZone.run()` se usa para la lógica real, Angular intercepta la creación del observer y puede triggear change detection por el solo hecho de que el callback sea llamado en la zona. La solución es crear el observer dentro de `runOutsideAngular()`:

```typescript
this.ngZone.runOutsideAngular(() => {
  this.resizeObserver = new ResizeObserver((entries) => {
    // ...
    this.ngZone.run(() => this.updateMenuWidth());
  });
  this.resizeObserver.observe(this.menuElement!);
});
```

---

### MALA-08 — Creación innecesaria de array en velocity buffer
**Archivo:** `mobile-menu-gestures.ts`, líneas 170-175

```typescript
private pushVelocitySample(x: number): void {
  const now = performance.now();
  this.velocityBuffer.push({ x, t: now });
  const cutoff = now - GESTURE_VELOCITY_WINDOW_MS;
  this.velocityBuffer = this.velocityBuffer.filter(p => p.t >= cutoff);  // ← nuevo array en cada pointermove
}
```

Este código crea un nuevo array en cada evento `pointermove` (que puede dispararse a 60-120fps). El patrón eficiente es eliminar elementos del inicio del array con `splice` o `shift`:

```typescript
private pushVelocitySample(x: number): void {
  const now = performance.now();
  this.velocityBuffer.push({ x, t: now });
  const cutoff = now - GESTURE_VELOCITY_WINDOW_MS;
  while (this.velocityBuffer.length > 0 && this.velocityBuffer[0].t < cutoff) {
    this.velocityBuffer.shift();
  }
}
```

---

## SECCIÓN 4: PROBLEMAS DE ACCESIBILIDAD

### A11Y-01 — El link del logo no tiene descripción accesible del destino
**Archivo:** `mobile-menu.html`, líneas 39-44

```html
<a [routerLink]="[currentLang, 'home']" class="header__logo mobile-logo" ...>
  {{ 'COMMON.BRAND_NAME' | translate }}
</a>
```

El texto del link es solo el nombre de marca. Para screen readers, no queda claro que este link lleva al "inicio" o "home". Debería tener `aria-label` o texto visualmente oculto con el destino:

```html
<a ... [attr.aria-label]="('COMMON.BRAND_NAME' | translate) + ' — ' + ('ARIA.GO_HOME' | translate)">
```

---

### A11Y-02 — Interacción posible con contenido de acordeón durante animación de colapso
**Archivo:** `mobile-menu-section.ts`, líneas 40-42 y SCSS líneas 473-488

```typescript
[attr.inert]="!isExpanded ? '' : null"
```

El atributo `inert` se elimina cuando `isExpanded` es `true`. Sin embargo, la animación CSS (`grid-template-rows: 0fr → 1fr`) tiene una duración de 400ms. Durante el colapso, `inert` ya se aplica pero el contenido aún es parcialmente visible (la animación CSS no está terminada). Esto es correcto. El problema inverso: al expandir, `inert` se elimina inmediatamente pero el contenido visualmente aún está apareciendo. Esto puede causar que el foco llegue a elementos que no son visibles para el usuario.

**Solución:** Añadir un pequeño delay antes de eliminar `inert` al expandir, o sincronizar con la transición CSS.

---

### A11Y-03 — La live region de búsqueda puede anunciar resultados prematuramente
**Archivo:** `mobile-menu.html`, líneas 71-79

```html
<div class="sr-only" aria-live="polite" aria-atomic="true">
  @if (searchController.searchQuery()) {
    @if (searchController.searchResultsCount() > 0) {
      {{ 'SEARCH.RESULTS_COUNT' | translate: { count: searchController.searchResultsCount() } }}
    } @else {
      {{ 'SEARCH.NO_RESULTS_FOUND' | translate }}
    }
  }
</div>
```

La región live anuncia resultados inmediatamente al cambiar el query. Sin embargo, el `onSearchChange` en `mobile-menu.ts` tiene un debounce de 300ms solo para analytics, no para la búsqueda en sí (que es instantánea). Esto significa que el screen reader puede anunciar resultados intermedios mientras el usuario sigue escribiendo, creando ruido auditivo excesivo.

**Solución:** Debounce la actualización del live region, o usar `aria-live="assertive"` selectivamente para el estado de "sin resultados".

---

### A11Y-04 — El botón de cerrar no tiene `type="button"` explícito
**Archivo:** `mobile-menu.html`, línea 47

```html
<button
  class="mobile-close-btn"
  (pointerdown)="$event.stopPropagation()"
  (click)="closeMobileMenu('button', $event)"
  [attr.aria-label]="'ARIA.CLOSE_MENU' | translate"
>
```

Dentro de un elemento que no es un `<form>`, un `<button>` sin `type` tiene comportamiento definido como `type="submit"` por la especificación HTML. Aunque no hay form aquí, es una mala práctica no declarar `type="button"` explícitamente en botones de acción. Aplicable también al botón "Clear search" y otros botones del menú.

---

## SECCIÓN 5: SEGURIDAD

### SEC-01 — URLs externas hardcodeadas sin validación
**Archivo:** `mobile-menu.constants.ts`, líneas 33-38 y 89-133

```typescript
export const SOCIAL_LINKS = {
  linkedin:  'https://linkedin.com/company/jsl-technology',
  github:    'https://github.com/jsl-technology',
  twitter:   'https://twitter.com/jsl_tech',
  instagram: 'https://instagram.com/jsl_tech',
} as const;
```

Las URLs sociales y de productos externos están hardcodeadas. Si algún dominio externo es comprometido o la empresa migra a otra plataforma, estas URLs no son configurables desde un entorno (env variable) o CMS. Para una app SSR/Angular Universal, idealmente deberían venir de variables de entorno o de un servicio de configuración. El `as const` previene mutaciones accidentales, lo cual es positivo.

---

### SEC-02 — `navigator.vibrate` puede activarse sin interacción del usuario en algunos browsers
**Archivo:** `mobile-menu.ts`, líneas 500-502

```typescript
if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.isActive)) {
  navigator.vibrate(5);
}
```

El operador `!navigator.userActivation` activa la vibración en browsers que no soportan la API `userActivation`. En Chrome 72+ y Firefox, `userActivation` existe, pero en Safari y algunos browsers móviles no existe. En esos casos, la condición se evalúa como `true` y la vibración puede activarse sin que el usuario haya interactuado activamente. Mejor verificar explícitamente:

```typescript
if (navigator.vibrate) {
  const hasActivation = navigator.userActivation;
  if (!hasActivation || hasActivation.isActive) {
    navigator.vibrate(5);
  }
}
```

---

## SECCIÓN 6: MEJORAS POTENCIALES

### MEJORA-01 — `currentYear` calculado solo al construir el componente (problema SSR)
**Archivo:** `mobile-menu.ts`, línea 146

```typescript
public currentYear = new Date().getFullYear();
```

En Angular Universal (SSR), el componente se construye en el servidor. Si el servidor está en UTC y el cliente en UTC-12, hay una ventana de tiempo en que el año diferirá. Usar un `computed()` signal o calcular en el template es más robusto. Con `DatePipe` de Angular:

```html
© {{ currentYear }} ...
```

O usando `DOCUMENT` token para mayor compatibilidad:

```typescript
public readonly currentYear = new Date().getFullYear();
```

Actualmente es un campo de clase simple, lo cual es aceptable para este caso de uso si SSR no es crítico.

---

### MEJORA-02 — Límite hardcodeado de 2 secciones expandidas en búsqueda
**Archivo:** `mobile-menu-search.controller.ts`, línea 47

```typescript
if (this.shouldShowSection(section.titleKey, section.links) && expandedCount < 2) {
```

El número 2 es arbitrario y está hardcodeado. Debería ser una constante nombrada o un parámetro configurable:

```typescript
private readonly MAX_AUTO_EXPANDED_SECTIONS = 2;
```

---

### MEJORA-03 — `horizontalThreshold` getter con lógica reentrante
**Archivo:** `mobile-menu-gestures.ts`, líneas 88-91

```typescript
private get horizontalThreshold(): number {
  const base = this.config.horizontalThreshold ?? GESTURE_HORIZONTAL_THRESHOLD;
  return this.isDragging ? base - 4 : base;
}
```

Cuando `isDragging` es `true`, el umbral se reduce de 6 a 2 px. Un umbral de 2px es extremadamente sensible y puede causar activaciones accidentales en dispositivos con pantalla pequeña o sensibilidad alta. Además, la lógica de "reducir el umbral cuando ya estamos arrastrando" es circular: se evalúa para determinar si se debe iniciar el arrastre, pero el valor cambia cuando el arrastre ya comenzó. Esto solo tiene efecto para gestos subsecuentes dentro de la misma sesión de puntero, pero la semántica es confusa.

---

### MEJORA-04 — `GestureBusService.handlePointerDown` silencia errores de `setPointerCapture`
**Archivo:** `gesture-bus.service.ts`, líneas 80-83

```typescript
try {
  (event.target as HTMLElement)?.setPointerCapture(event.pointerId);
} catch (e) {
  /* capture might fail on some elements/conditions */
}
```

El comentario es insuficiente. Si `setPointerCapture` falla en un dispositivo de producción, el drawer perderá el tracking del puntero y los gestos no funcionarán correctamente. Al menos debería logearse en modo dev:

```typescript
} catch (e) {
  if (isDevMode()) console.warn('[GestureBus] setPointerCapture failed:', e);
}
```

---

### MEJORA-05 — El `.sr-only` está definido dentro del componente en lugar de globalmente
**Archivo:** `mobile-menu.scss`, líneas 27-37

```scss
.mobile-menu-container {
  .sr-only {
    position: absolute;
    width: 1px;
    // ...
  }
}
```

La clase utilitaria `.sr-only` (screen-reader only) es una utilidad global estándar (equivalente de Tailwind's `sr-only`). Definirla dentro del scope del componente (especialmente con `ViewEncapsulation.None`) hace que su disponibilidad dependa de que el componente esté en el DOM. Debería estar en los estilos globales del proyecto.

---

### MEJORA-06 — `destroy()` de `DrawerTransitionCoordinator` no nulifica config
**Archivo:** `drawer-transition-coordinator.ts`, líneas 163-165

```typescript
public destroy(): void {
  this.clearTransitionListeners();
}
```

Las referencias en `config` (callbacks como `onA11yOpen`, `onRegisterOverlay`, etc.) mantienen referencias al componente padre vivas. Para evitar memory leaks, debería nulificarse:

```typescript
public destroy(): void {
  this.clearTransitionListeners();
  (this.config as unknown) = null;
}
```

---

### MEJORA-07 — Señales reactivas subutilizadas en el componente principal
**Archivo:** `mobile-menu.ts`, líneas 90, 102, 147

Propiedades como `currentLang`, `menuSections`, y `currentYear` son campos de clase simples mutados imperativamente. Con Angular Signals (que ya se usa en el proyecto para `menuService.isMobileMenuOpen()`), estas podrían ser `signal()` o `computed()`, reduciendo la dependencia en `cdRef.markForCheck()` manual.

---

### MEJORA-08 — El effect() no guarda referencia para limpieza manual
**Archivo:** `mobile-menu.ts`, líneas 178-196

```typescript
effect(() => {
  const isOpen   = this.menuService.isMobileMenuOpen();
  const isMobile = this.breakpointService.isMobile();
  // ...
});
```

El `effect()` retorna un `EffectRef` que no se almacena. Aunque `destroyRef` maneja la limpieza automática al destruir el componente, guardar la referencia permite cancelar el efecto manualmente si es necesario (p.ej., en ciertos escenarios de testing o inicialización tardía).

---

### MEJORA-09 — Ausencia de test de integración para el cierre con Escape durante búsqueda activa
**Archivos:** `mobile-menu.spec.ts`, `mobile-menu-elastic.spec.ts`

Los tests existentes cubren comportamiento básico de apertura/cierre y gestos elásticos. No hay tests para:
- Cierre con Escape mientras hay una búsqueda activa (¿se limpia el query?)
- Restauración de secciones expandidas al cancelar búsqueda con Escape vs con el botón clear
- Comportamiento del focus trap cuando el menú se cierra mientras el foco está en el input de búsqueda

---

## RESUMEN EJECUTIVO

| Categoría              | Crítico | Alto | Medio | Bajo |
|------------------------|---------|------|-------|------|
| Bugs / Errores         | 0       | 2    | 2     | 1    |
| Inconsistencias        | 0       | 1    | 3     | 2    |
| Malas prácticas        | 0       | 2    | 4     | 2    |
| Accesibilidad          | 1       | 1    | 2     | 0    |
| Seguridad              | 0       | 1    | 1     | 0    |
| Mejoras                | 0       | 0    | 4     | 5    |

**Prioridad de corrección recomendada:**

1. **[CRÍTICO]** `A11Y-04` — Añadir `type="button"` en todos los `<button>` del menú
2. **[ALTO]** `BUG-01` — Corregir `aria-hidden` en focus sentinels
3. **[ALTO]** `BUG-04` — Verificar y corregir inconsistencia de marca "virtex" vs "virteex"
4. **[ALTO]** `SEC-01` — Mover URLs externas a variables de entorno o servicio de config
5. **[ALTO]** `MALA-01` — Evaluar migración de `ViewEncapsulation.None` a `Emulated`
6. **[MEDIO]** `BUG-03` — Race condition en `completeTransition` (visible solo en gestos muy rápidos)
7. **[MEDIO]** `MALA-08` — Optimizar velocity buffer (garbage collection en 60fps)
8. **[MEDIO]** `MALA-04` — Reemplazar `transition: all` por propiedades específicas
9. **[MEDIO]** `A11Y-03` — Debounce del live region de búsqueda
10. **[BAJO]** Resto de mejoras y consistencia de código
