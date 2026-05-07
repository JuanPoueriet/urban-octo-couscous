# Análisis Técnico — Mobile Menu (Drawer Navigation)
Fecha: 2026-05-06  
Archivos analizados: mobile-menu.ts, mobile-menu.html, mobile-menu.scss,
mobile-menu-gestures.ts, mobile-menu-accessibility.ts, mobile-menu-search.controller.ts,
mobile-menu-section.ts, mobile-menu-quick-access.ts, mobile-menu-search.ts,
drawer-transition-coordinator.ts, mobile-menu.constants.ts, gesture-bus.service.ts,
mobile-menu.spec.ts, mobile-menu-elastic.spec.ts

---

## SECCIÓN 1 — BUGS CRÍTICOS (rompen funcionalidad)

### BUG-01 · `isEdgeSwipeActive` no se resetea al terminar un gesto
**Archivo:** `mobile-menu-gestures.ts`  
**Método:** `handleEdgeSwipeEnd`, `handleEdgeSwipeCancel`

Después de completar o cancelar un edge-swipe, `isEdgeSwipeActive` permanece en `true`.
La siguiente acción que llame a `startOverlayInteraction` (toque en el overlay) no resetea
`isEdgeSwipeActive`. Resultado: en `onPointerMove`, la condición
`if (this.isEdgeSwipeActive)` tiene precedencia y desvía los eventos hacia
`handleEdgeSwipeMove` en lugar de `handleOverlayMove`.

El flujo defectuoso:
1. Usuario hace edge-swipe → abre menú → `isEdgeSwipeActive = true`
2. Usuario toca el overlay para cerrar → `startOverlayInteraction` se llama
   → `isOverlaySwipeActive = true`, pero `isEdgeSwipeActive` sigue siendo `true`
3. El drag del overlay se procesa como si fuera un edge-swipe → comportamiento incorrecto

`startMenuDrag` sí resetea `isEdgeSwipeActive = false`, pero `startOverlayInteraction`
no lo hace. Tampoco lo hacen `handleEdgeSwipeEnd` ni `handleEdgeSwipeCancel`.

**Fix:** Al inicio de cada método `start*`, resetear todos los flags exclusivos:
```ts
// En startOverlayInteraction, startMenuDrag, startEdgeSwipe:
this.isEdgeSwipeActive    = false;
this.isOverlaySwipeActive = false;
// luego set el flag correspondiente
```
También agregar en `handleEdgeSwipeEnd` y `handleEdgeSwipeCancel`:
```ts
this.isEdgeSwipeActive = false;
```

---

### BUG-02 · `trapFocus` y `handleSentinelFocus` llaman `refreshFocusableElements()` con debounce y luego usan la lista inmediatamente
**Archivo:** `mobile-menu-accessibility.ts`  
**Métodos:** `trapFocus`, `handleSentinelFocus`

```ts
// trapFocus:
if (this.focusableElements.length === 0) {
  this.refreshFocusableElements();   // debounce 32ms → no hace nada ahora
}
if (this.focusableElements.length === 0) return;   // siempre devuelve si lista vacía

// handleSentinelFocus:
this.refreshFocusableElements();     // debounce 32ms
if (this.focusableElements.length === 0) return;   // puede devolver aunque elementos existan
```

Si la lista está vacía (primera apertura, antes de que haya corrido el MutationObserver),
el trap de foco no funciona. El Tab no queda atrapado y el usuario puede salir del menú.

**Fix:** Llamar `refreshFocusableElements(true)` (modo inmediato) cuando se necesita el
resultado de forma sincrónica:
```ts
if (this.focusableElements.length === 0) {
  this.refreshFocusableElements(true);  // immediate=true
}
```

---

### BUG-03 · Doble fuente de verdad en el estado del drawer
**Archivos:** `mobile-menu.ts` (campo `drawerState`), `drawer-transition-coordinator.ts` (campo `currentState`)

El componente y el coordinador tienen copias separadas del estado FSM. Se sincronizan
vía el callback `onStateChange`. Si ese callback lanza una excepción, los estados
divergen silenciosamente y los guards FSM (`openDrawer`, `closeDrawer`) toman decisiones
basadas en un estado incorrecto.

Un ejemplo concreto: `transitionTo(DrawerState.DRAGGING)` en `stopTransition()` actualiza
`drawerState` en el componente. Pero si se llama antes de que el coordinador haya procesado
el estado anterior, `transitionCoordinator.currentState` y `this.drawerState` pueden estar
desfasados.

---

### BUG-04 · `handleMenuDragMove` guard rompe soporte para interrumpir animación closing
**Archivo:** `mobile-menu-gestures.ts`, línea 430

```ts
if (!this.config.isOpen() && !this.config.isAnimating()) return;
```

`isOpen()` lee `this.isMobileMenuOpen` (signal del servicio). Cuando el drawer está en
estado `CLOSING` (animando hacia cerrado), `isOpen()` ya es `false` (el servicio cambió
el signal). Si el guard usa `isOpen()` en vez del estado visual real, el drag se bloquea
durante la animación de cierre aunque `isAnimating()` sea `true`.

Verificar en el servicio `MenuService.close()` exactamente cuándo cambia el signal vs
cuándo el coordinador entra en `CLOSING`. Si el signal cambia antes que el coordinador
entre en `CLOSING`, este guard puede devolver pronto y bloquear el gesto de interrupción.

---

## SECCIÓN 2 — BUGS IMPORTANTES (degradan UX)

### BUG-05 · `onTransitionComplete` en `gestureConfig` es código muerto
**Archivo:** `mobile-menu.ts`, `setupGestures()`

```ts
this.gestureConfig = {
  ...
  onTransitionComplete: () => this.gestureHandler?.startCooldown(),
};
```

`MobileMenuGestures` nunca llama `this.config.onTransitionComplete?.()`. El callback
existe en la interfaz `MobileMenuGestureConfig` pero no hay ningún callsite en la clase
gestora. El cooldown sí se llama desde `initializeCoordinator`:

```ts
onTransitionComplete: () => {
  this.gestureHandler?.startCooldown();
},
```

Resultado: `gestureConfig.onTransitionComplete` nunca se ejecuta. Es código muerto que
confunde la lectura. Eliminar el campo de `MobileMenuGestureConfig` o implementar la
llamada en la clase gestora.

---

### BUG-06 · `MobileMenuSearch` — `@Input()` mutable vía `[(ngModel)]`
**Archivo:** `mobile-menu-search.ts`

```ts
@Input() searchQuery = '';
[(ngModel)]="searchQuery"
(ngModelChange)="onSearchChange.emit(searchQuery)"
```

`ngModel` muta directamente la propiedad `@Input()`. Cuando el padre actualiza el input
(signal → `searchController.searchQuery()`), y simultáneamente el usuario teclea, hay
un ciclo: usuario teclea → ngModel actualiza `this.searchQuery` → emite → padre procesa →
padre pasa el valor de vuelta → ngModel lo sobrescribe. Si el padre tiene `OnPush` y el
hijo no, este ciclo puede causar estados intermedios visibles.

**Fix:** Separar el estado local del input del valor recibido del padre:
```ts
localQuery = '';
writeValue(v: string) { this.localQuery = v; }
```
O usar un componente controlado sin ngModel.

---

### BUG-07 · Comentario incorrecto en `getComputedStyle` del accessor
**Archivo:** `mobile-menu-accessibility.ts`, línea 83-85

```ts
// Use computedStyle instead of getBoundingClientRect to avoid forced reflows
// on every element. computedStyle reads are batched by the browser without
// triggering layout, keeping this filter jank-free on large menus.
```

El comentario afirma que `getComputedStyle` no fuerza reflows. Esto es falso.
`window.getComputedStyle(el)` sí puede desencadenar un recalc de estilos (style
recalculation), y si el estilo depende de la geometría (ej. `width: auto`), también
fuerza layout. Para filtros masivos sobre muchos elementos, usar la intersección
de `classList` o data attributes sería más eficiente.

---

### BUG-08 · `will-change: transform` permanente en el drawer
**Archivo:** `mobile-menu.scss`, `.header__nav-links-mobile`

```scss
will-change: transform;
```

`will-change: transform` promueve el elemento a su propia capa de composición de GPU
de forma permanente, incluso cuando el menú está cerrado e inerte. Esto consume memoria
de GPU innecesariamente el 90% del tiempo. Debe activarse sólo durante la animación.

**Fix:** Mover a clases dinámicas:
```scss
&.is-animating, &.dragging {
  will-change: transform;
}
```
Y aplicar/quitar la clase en `openDrawer`/`closeDrawer` / `onTransitionComplete`.

---

### BUG-09 · Ausencia de `overscroll-behavior-y: contain` en contenido scrollable
**Archivo:** `mobile-menu.scss`, `.mobile-menu-content`

Sin `overscroll-behavior-y: contain`, cuando el usuario llega al final del scroll del
contenido y sigue arrastrando, el navegador propaga el scroll a la página de fondo
(efecto rubber-band en iOS). Especialmente visible en iPhone.

**Fix:**
```scss
.mobile-menu-content {
  overflow-y: auto;
  overscroll-behavior-y: contain;
}
```

---

### BUG-10 · Quick-access con 4 tiles en grid de 3 columnas
**Archivo:** `mobile-menu.scss`, `mobile-menu-quick-access.ts`

El grid define `repeat(3, 1fr)` pero hay 4 tiles: Contact, Pricing, FAQ, Support.
El 4to tile (Support) queda solo en la segunda fila, alineado a la izquierda.
No es un crash pero es visualmente desequilibrado en todos los dispositivos.

**Opciones:** Cambiar a `repeat(2, 1fr)` con 4 tiles en 2×2, o a `repeat(4, 1fr)` si
el espacio lo permite, o reducir a 3 tiles eliminando uno.

---

## SECCIÓN 3 — INCONSISTENCIAS

### INC-01 · Child components sin `ChangeDetectionStrategy.OnPush`
**Archivos:** `mobile-menu-quick-access.ts`, `mobile-menu-search.ts`, `mobile-menu-section.ts`

El componente padre usa `ChangeDetectionStrategy.OnPush`, pero ninguno de los hijos
lo declara. Esto cancela la optimización del padre: Angular re-renderiza todos los
hijos en cada ciclo de detección de cambios global, aunque sus inputs no hayan cambiado.
El efecto es especialmente notable durante gestos (muchos ticks de CD por frame).

---

### INC-02 · `MOBILE_MENU_DEFAULT_WIDTH` definido pero nunca usado
**Archivo:** `mobile-menu.constants.ts`, línea 5

```ts
export const MOBILE_MENU_DEFAULT_WIDTH = 320; // px — fallback before DOM measurement
```

Esta constante no se importa ni usa en ningún archivo. Código muerto.
El fallback real es `MOBILE_MENU_MAX_WIDTH` (380).

---

### INC-03 · `overlayDownX/Y` y `startX/Y` son siempre iguales
**Archivo:** `mobile-menu-gestures.ts`, `startOverlayInteraction()`

```ts
this.overlayDownX = event.clientX;
this.overlayDownY = event.clientY;
this.startX       = event.clientX;  // idéntico
this.startY       = event.clientY;  // idéntico
```

`overlayDownX/Y` y `startX/Y` se inicializan con los mismos valores y uno de los pares
es redundante. `handleOverlayEnd` usa `overlayDownX/Y` y `handleOverlayMove` usa
`startX/Y`. Unificar a un solo par de campos.

---

### INC-04 · Patrón de navegación inconsistente entre templates
**Archivo:** `mobile-menu.html`, `mobile-menu-section.ts`

La CTA de contacto en el menú principal usa:
```html
(click)="onMenuRouteNavigate(...); $event.preventDefault()"
```
Las secciones usan:
```html
(click)="handleRouteClick(link.route, link.key, $event)"
```
El logo usa también el primer patrón. Deberían usar un único patrón de navegación
consistente para todos los enlaces internos.

---

### INC-05 · Easing inconsistente en el accordion (grid vs opacity)
**Archivo:** `mobile-menu.scss`

```scss
.accordion-content {
  transition:
    grid-template-rows $mm-drawer-duration cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.35s ease;
}
```

La duración del grid usa `$mm-drawer-duration` (400ms) pero la opacidad usa 0.35s fijo.
Los easing son distintos (`cubic-bezier` vs `ease`). El contenido aparece visualmente
antes de que el espacio haya terminado de expandirse. Ambas transiciones deben tener
la misma duración y easing, o al menos estar documentadas como distintas intencionalmente.

---

### INC-06 · Doble registro de `onTransitionComplete` cooldown
**Archivos:** `mobile-menu.ts`, líneas 293 y 406

```ts
// En initializeCoordinator():
onTransitionComplete: () => {
  this.gestureHandler?.startCooldown();
},

// En setupGestures() (gestureConfig):
onTransitionComplete: () => this.gestureHandler?.startCooldown(),
```

El primero es el único que se ejecuta. El segundo es código muerto (ver BUG-05).
Confunde la lectura y sugiere que el cooldown se llama dos veces (no es así).

---

### INC-07 · `MobileMenuSearch` expone `searchResultsCount` como input pero no lo usa
**Archivo:** `mobile-menu-search.ts`

```ts
@Input() searchResultsCount = 0;
```

El input existe en la clase y se pasa desde el padre, pero en el template del componente
`jsl-mobile-menu-search` no se usa `searchResultsCount` en ningún lugar visible.
¿Para qué sirve si no se usa? Podría ser un vestigio de un diseño anterior.

---

### INC-08 · RTL inconsistente entre gesture handler y coordinator
**Archivos:** `mobile-menu-gestures.ts` (usa `sessionIsRtl`, snapshot), 
`drawer-transition-coordinator.ts` (usa `this.config.prefersReducedMotion()`, live)

El handler de gestos captura `isRtl()` al inicio del gesto y la congela. El coordinador
llama `prefersReducedMotion()` en tiempo real al resolver la transición. Si el usuario
cambia configuración de accesibilidad a mitad de una animación, el coordinador responde
pero el gesture handler no. Documentar esta asimetría intencional o unificar la estrategia.

---

## SECCIÓN 4 — MALAS PRÁCTICAS

### MP-01 · `afterNextRender` dentro de handler de evento repetido
**Archivo:** `mobile-menu.ts`, `onSearchChange()`

```ts
afterNextRender(() => {
  this.a11y.refreshFocusableElements();
}, { injector: this.injector });
```

Cada llamada a `onSearchChange` registra un nuevo callback en `afterNextRender`. Con
búsqueda en tiempo real (un callback por tecla), se acumulan múltiples subscripciones
que todas ejecutan `refreshFocusableElements` en el mismo ciclo de render. Esto produce
N recálculos de `focusableElements` donde N = número de caracteres tecleados en una rafaga.

**Fix:** Usar la referencia al timer de debounce ya existente, o simplemente llamar
`this.a11y.refreshFocusableElements()` con debounce directamente sin `afterNextRender`.

---

### MP-02 · Acoplamiento fuerte entre componente y gesture handler vía state getters
**Archivos:** `mobile-menu.ts`, `mobile-menu-gestures.ts`

`boundTouchMove` llama:
```ts
this.gestureHandler?.getIsDragging()
this.gestureHandler?.getIsHorizontalGesture()
this.gestureHandler?.isTracking()
```

El componente lee el estado interno del gesture handler para tomar decisiones de scroll.
Esto crea acoplamiento bidireccional. Una arquitectura más limpia sería que el gesture
handler emita un evento/observable cuando el estado de tracking cambia, o que exponga
un método `shouldPreventScroll(touchEvent)` que encapsule esa lógica.

---

### MP-03 · `@Output() onClose` viola la convención Angular de naming
**Archivos:** `mobile-menu-quick-access.ts`, `mobile-menu-search.ts`

Angular Style Guide (AO-05) indica que los `@Output()` deben nombrarse como eventos
sin prefijo "on" (ej. `closed`, `searched`). El prefijo "on" va en el handler del padre.
`onClose` debería ser `closed`; `onSearchChange` debería ser `searchChanged`.

Esto no causa un error pero viola la convención establecida y crea confusión entre
el evento emitido y el handler que lo consume.

---

### MP-04 · `translate.instant()` puede devolver la clave si las traducciones no están cargadas
**Archivo:** `mobile-menu-search.controller.ts`, `getTranslatedLowercase()`

```ts
const translated = this.translate.instant(key).toLowerCase();
this.translationCache.set(key, translated);
```

`translate.instant()` devuelve la clave literal si la traducción no está disponible en el
momento de la llamada. El resultado se cachea, por lo que si el caché se poblara antes de
que carguen las traducciones, los resultados de búsqueda serían incorrectos para siempre
hasta que `setMenuSections` borre el caché.

En SSR, las traducciones pueden no estar disponibles en el primer render.

---

### MP-05 · Métodos `destroy()` manuales en lugar de `DestroyRef`
**Archivos:** `mobile-menu-gestures.ts`, `drawer-transition-coordinator.ts`, 
`mobile-menu-accessibility.ts`

Las tres clases de apoyo implementan `destroy()` manualmente. Si el componente olvida
llamarlos (o falla antes de la llamada), hay memory leaks. El patrón Angular moderno
es inyectar `DestroyRef` y registrar callbacks vía `destroyRef.onDestroy(...)`. Dado que
estas clases no son injectables, el componente debería al menos garantizar la llamada
dentro de un `try/finally`.

---

### MP-06 · Mutación directa de `@Input()` en `MobileMenuSearch.clearSearch()`
**Archivo:** `mobile-menu-search.ts`

```ts
clearSearch() {
  this.searchQuery = '';  // muta el @Input() directamente
  this.onSearchChange.emit('');
}
```

En Angular, mutar un `@Input()` en el hijo puede causar comportamiento no determinístico
en OnPush: el padre no detecta que el input cambió porque fue el hijo quien lo cambió.
El estado local del componente y el estado del padre divergen hasta el próximo CD.

---

### MP-07 · `searchResultsCount` computed depende de lógica hardcodeada
**Archivo:** `mobile-menu-search.controller.ts`, línea 23

```ts
if (this.shouldShowLink('HEADER.CONTACT')) count++;
```

El botón CTA de "Contact" no forma parte de `menuSections`, por lo que el computed
lo cuenta por separado con su clave hardcodeada. Si el CTA se elimina, mueve, o
cambia de clave, hay que actualizar este computed manualmente.

---

## SECCIÓN 5 — PROBLEMAS DE PERFORMANCE

### PERF-01 · MutationObserver con `subtree: true` y atributos `class`/`style`
**Archivo:** `mobile-menu-accessibility.ts`, `startObserving()`

```ts
this.observer.observe(container, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'hidden', 'inert', 'class', 'style']
});
```

Observar cambios en `class` y `style` con `subtree: true` genera un callback en el
MutationObserver cada vez que cualquier elemento dentro del menú recibe una clase o
estilo. Durante animaciones (accordion expandiéndose, dragging clase aplicándose), esto
dispara múltiples callbacks por frame, cada uno encolando un `setTimeout` de 32ms.

**Impacto real:** Cada apertura/cierre de accordion + cada frame de drag gesture = múltiples
callbacks de MutationObserver + múltiples timers de 32ms + múltiples `querySelectorAll` +
múltiples `getComputedStyle` en todos los elementos focusables.

**Fix:** Observar sólo `childList` y attributes específicos de accesibilidad
(`disabled`, `hidden`, `inert`), sin `class` ni `style`:
```ts
attributeFilter: ['disabled', 'hidden', 'inert']
```

---

### PERF-02 · `hover` con cambio de `padding-inline-start` en lugar de `transform`
**Archivo:** `mobile-menu.scss`, `.mobile-links-list li a:hover`

```scss
&:hover {
  padding-inline-start: 28px; // desplaza 4px desde 24px
```

Cambiar `padding` en hover provoca reflow del layout en cada hover, afectando a los
elementos vecinos en el flujo. `transform: translateX(4px)` logra el mismo efecto visual
sin coste de reflow (solo composite layer).

---

### PERF-03 · `getMobileMenuSections()` crea arrays nuevos en cada cambio de idioma
**Archivo:** `mobile-menu.ts`, `initMenuSections()`

```ts
this.menuSections = getMobileMenuSections(this.currentLang);
```

Cada cambio de idioma crea 5 secciones × N links = ~30 objetos nuevos. Angular detecta
el cambio de referencia y re-renderiza todos los `jsl-mobile-menu-section`. Dado que los
hijos no tienen `OnPush`, re-renderizarán completamente. Memoizar la función por idioma
evitaría re-renderizados innecesarios si el idioma no cambia.

---

### PERF-04 · `accordion` anima dos propiedades simultáneas con timings distintos
**Archivo:** `mobile-menu.scss`

Grid transition: 400ms `cubic-bezier(0.4, 0, 0.2, 1)`  
Opacity transition: 350ms `ease`

El elemento alcanza `grid-template-rows: 1fr` antes de que la opacidad sea 1. Durante
esos 50ms finales, el contenido es completamente visible pero la opacidad puede seguir
subiendo. Unificar los timings eliminaría el composite timing issue.

---

## SECCIÓN 6 — ACCESIBILIDAD

### A11Y-01 · `sr-only` de estado en accordion es redundante con `aria-expanded`
**Archivo:** `mobile-menu-section.ts`, template

```html
<span class="sr-only">
  {{ (isExpanded ? 'ARIA.EXPANDED' : 'ARIA.COLLAPSED') | translate }}
</span>
```

El atributo `aria-expanded="true/false"` en el `<button>` ya comunica este estado a los
lectores de pantalla. La `span.sr-only` causa que los lectores de pantalla anuncien el
estado dos veces: una del atributo ARIA y otra del texto oculto. Eliminar la `span.sr-only`.

---

### A11Y-02 · `list-style: none` en `<ul>` elimina semántica de lista en Safari VoiceOver
**Archivo:** `mobile-menu.scss`, `.mobile-links-list`

```scss
.mobile-links-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
```

Safari VoiceOver elimina la semántica de lista (`role="list"`) cuando se aplica
`list-style: none` sin `role="list"` explícito en el HTML. Los usuarios de VoiceOver en
iOS no escuchan "lista de N elementos" al entrar.

**Fix:**
```html
<ul class="mobile-links-list" role="list">
```

---

### A11Y-03 · `prefers-reduced-motion` no aplicado al accordion
**Archivo:** `mobile-menu.scss`

El drawer respeta `prefers-reduced-motion` con:
```scss
@media (prefers-reduced-motion: reduce) {
  transition: none !important;
}
```

Pero el accordion no tiene esta media query. Usuarios con sensibilidad al movimiento
verán la animación del accordion aunque tengan la preferencia activada.

**Fix:** Añadir al bloque `.accordion-content`:
```scss
@media (prefers-reduced-motion: reduce) {
  transition: none !important;
}
```

---

### A11Y-04 · Focus no queda atrapado en el menú si `focusableElements` está vacío
**Ver BUG-02.** El trap de foco falla si la lista de focusables no se ha inicializado.
Esto ocurre en la primera apertura si `refreshFocusableElements(true)` no se llama
en `setInitialFocus`.

---

### A11Y-05 · `inert` en accordion content puede eliminar focus antes de que termine la animación de cierre
**Archivo:** `mobile-menu-section.ts`, template

```html
[attr.inert]="!isExpanded ? '' : null"
```

Cuando el usuario colapsa una sección con Tab o click, `inert` se aplica en el mismo
ciclo de CD que inicia la animación de cierre. Si el foco estaba dentro del accordion,
el navegador mueve el foco fuera del elemento inert de forma inmediata. El foco puede
saltar a un lugar inesperado antes de que la animación termine.

**Fix:** Aplicar `inert` después de que la animación de cierre termine, no al inicio.
Esto requiere escuchar el evento `transitionend` del elemento o usar un delay equivalente
a la duración de la transición.

---

## SECCIÓN 7 — TESTS

### TEST-01 · `expect().nothing()` no verifica comportamiento real
**Archivo:** `mobile-menu.spec.ts`, línea 148-152

```ts
it('should clear debounce timer on destroy', () => {
  component.onSearchChange('Serv');
  fixture.destroy();
  expect().nothing();  // siempre pasa
});
```

El test no verifica nada. El nombre promete validar que el timer se limpie, pero no
hay assertion. Debería verificar que no haya excepciones (usar `expect(() => fixture.destroy()).not.toThrow()`)
o verificar estado interno con un spy en `clearTimeout`.

---

### TEST-02 · Uso de `await new Promise(resolve => setTimeout(resolve, 500))`
**Archivo:** `mobile-menu.spec.ts`, líneas 169, 178

Timers reales en tests hacen los tests lentos y frágiles (500ms × 2 = 1 segundo en este
solo test). El comportamiento varía según la velocidad del entorno de CI. Deben usarse
`fakeAsync`/`tick()` o `provideZonelessChangeDetection` con `flush()`.

---

### TEST-03 · `RouterTestingModule` deprecado en Angular 17+
**Archivo:** `mobile-menu.spec.ts`

`RouterTestingModule` está marcado como deprecated. Usar `provideRouter([])` o
`provideLocationMocks()` en el array de providers.

---

### TEST-04 · Test del background inert prueba comportamiento no implementado en el componente
**Archivo:** `mobile-menu.spec.ts`, líneas 154-186

El test espera que `<main>` y `<footer>` reciban `inert` cuando el menú abre.
Esta lógica debe estar en `OverlayManagerService` (no leído completamente) o en el
componente. Sin ver el servicio, este test puede estar probando comportamiento no
implementado. Si `OverlayManagerService` no aplica `inert` a elementos background, el
test fallará en CI.

---

### TEST-05 · Ausencia de tests para el gestor de gestos completo
El archivo `mobile-menu-elastic.spec.ts` solo prueba la física elástica. No hay tests para:
- Reconocimiento del gesto horizontal vs vertical (el bug del angular ratio)
- Cancelación por `pointercancel`
- Edge-swipe en RTL y LTR end-to-end
- Cooldown entre gestos
- Interacción overlay → drag → cancel
- El bug de `isEdgeSwipeActive` no reseteado (BUG-01)

---

### TEST-06 · `mobile-menu-elastic.spec.ts` tiene comentario incorrecto
**Línea 103-104:**

```ts
// For onMenuPointerMove (dragging an already open menu), diffX IS the translateX.
```

Esto es incorrecto. `translateX = initialTranslateX + diffX`. `diffX` solo es igual a
`translateX` cuando `initialTranslateX = 0` (menú completamente abierto). El comentario
induce a error al lector sobre la semántica de las variables.

---

## SECCIÓN 8 — SEGURIDAD / ROBUSTEZ

### SEC-01 · URLs externas hardcodeadas en constants — riesgo de mantenimiento
**Archivo:** `mobile-menu.constants.ts`

```ts
{ key: 'PRODUCTS_LIST.ERP', href: 'https://virtex.com', ... },
{ key: 'PRODUCTS_LIST.POS', href: 'https://pos.jsl.technology', ... },
```

Las URLs están en el código fuente. Cambiar una URL requiere un rebuild y deploy. Si
estas URLs necesitan ser dinámicas (multi-tenant, ambientes de staging), el sistema no
lo soporta. Considerar cargar URLs desde configuración externa o variables de entorno
inyectadas en build time.

No hay riesgo de XSS porque los valores son literales en TypeScript, pero es un riesgo
de mantenimiento.

---

### ROB-01 · `gestureHandler` puede ser `null` cuando el coordinador llama `startCooldown`
**Archivo:** `mobile-menu.ts`, `initializeCoordinator()`

```ts
onTransitionComplete: () => {
  this.gestureHandler?.startCooldown();
},
```

El optional chaining `?.` maneja el caso null, pero hay una window entre la construcción
del coordinador (en el constructor) y la asignación de `gestureHandler` (en `setupGestures`,
llamado en `ngAfterViewInit`). Si una transición se completa antes de `ngAfterViewInit`
(improbable en práctica), `startCooldown` nunca se llama. No es un crash pero es
una edge case no documentada.

---

### ROB-02 · `transitionFallbackTimer` usa `DRAWER_TRANSITION_DURATION_MS + 100` fijo
**Archivo:** `drawer-transition-coordinator.ts`, línea 164

```ts
}, reducedMotion ? 0 : DRAWER_TRANSITION_DURATION_MS + 100);
```

El fallback timer asume que la transición dura exactamente `DRAWER_TRANSITION_DURATION_MS`.
Si el CSS cambia la duración (por ejemplo, en `@media (update: slow)` o si alguien sobreescribe
el transition en CSS), el timer puede dispararse antes que `transitionend`. Esto dejaría el
componente en estado `OPENING/CLOSING` brevemente, potencialmente permitiendo triggers de
gestos en momentos incorrectos.

---

## SECCIÓN 9 — MEJORAS SUGERIDAS (no bugs)

### MEJ-01 · Agregar `overscroll-behavior-y: contain` (ya documentado en BUG-09)

### MEJ-02 · Mover `touch-action` a contenedor scroll en lugar del drawer completo
Cambiar `touch-action: pan-y` del drawer al `.mobile-menu-content` exclusivamente.
Dado que `touch-action` se evalúa por elemento (no heredado de padres de forma restrictiva),
los gestos de cierre en el área no-scrollable del drawer no serían afectados por `pan-y`.
Sin embargo, los gestos que empiezan sobre links o contenido (dentro de `.mobile-menu-content`)
seguirían siendo susceptibles a `pointercancel`.

### MEJ-03 · Reducir API pública del gesture handler
`getIsDragging()`, `getIsHorizontalGesture()`, `isTracking()` son métodos públicos que
exponen estado interno. Encapsular en un método único:
```ts
public shouldPreventScroll(touchStartX: number, touchStartY: number, currentX: number, currentY: number): boolean
```

### MEJ-04 · Añadir `@media (prefers-reduced-motion)` al accordion

### MEJ-05 · Reemplazar `RouterTestingModule` por `provideRouter([])`

### MEJ-06 · Añadir `ChangeDetectionStrategy.OnPush` a todos los componentes hijos

### MEJ-07 · Unificar duración y easing del accordion (grid + opacity)

### MEJ-08 · Sustituir `will-change: transform` permanente por clase condicional

### MEJ-09 · Agregar `role="list"` a los `<ul>` para compatibilidad con Safari VoiceOver

### MEJ-10 · Cambiar `padding-inline-start` en hover por `transform: translateX()`
```scss
&:hover {
  transform: translateX(4px);  // en lugar de cambiar padding
}
```

---

## RESUMEN POR SEVERIDAD

| Severidad  | Cantidad | Items |
|------------|----------|-------|
| Crítico    | 4        | BUG-01, BUG-02, BUG-03, BUG-04 |
| Importante | 6        | BUG-05..BUG-10 |
| Inconsistencia | 8   | INC-01..INC-08 |
| Mala práctica  | 7  | MP-01..MP-07 |
| Performance    | 4  | PERF-01..PERF-04 |
| Accesibilidad  | 5  | A11Y-01..A11Y-05 |
| Tests          | 6  | TEST-01..TEST-06 |
| Seguridad/Robustez | 3 | SEC-01, ROB-01, ROB-02 |
| Mejoras    | 10       | MEJ-01..MEJ-10 |
| **TOTAL**  | **53**   | |

---

## PRIORIDAD DE FIX RECOMENDADA

1. **BUG-01** — `isEdgeSwipeActive` no reseteado → close gesture falla después de edge-swipe
2. **BUG-02** — trap de foco no funciona en primera apertura
3. **BUG-09** — `overscroll-behavior-y` → scroll propaga a página de fondo en iOS
4. **A11Y-03** — `prefers-reduced-motion` faltante en accordion
5. **PERF-01** — MutationObserver demasiado amplio → jank durante gestos
6. **INC-01** — Hijos sin `OnPush` → re-renders innecesarios
7. **BUG-05** — `onTransitionComplete` en gestureConfig es código muerto
8. **A11Y-01** — Estado de accordion anunciado dos veces por lectores de pantalla
9. **PERF-02** — `padding` en hover → reflow
10. **BUG-08** — `will-change: transform` permanente → memoria GPU desperdiciada
