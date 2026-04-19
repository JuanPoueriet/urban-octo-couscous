import { Component, Input, OnChanges, HostBinding } from '@angular/core';

/**
 * Componente de imagen multi-formato con soporte AVIF → WebP → JPEG.
 * Usa el elemento <picture> nativo para máxima compatibilidad de navegadores.
 *
 * Uso básico:
 *   <jsl-picture avifSrc="assets/imgs/Avif/hero.avif" alt="Hero" [fill]="true" [priority]="true">
 *
 * Cuando los archivos WebP/JPEG estén disponibles:
 *   <jsl-picture avifSrc="..." webpSrc="..." fallbackSrc="..." alt="...">
 */
@Component({
  selector: 'jsl-picture',
  standalone: true,
  templateUrl: './picture.html',
  styleUrl: './picture.scss'
})
export class PictureComponent implements OnChanges {
  /** Ruta al archivo AVIF (fuente principal). Requerido. */
  @Input({ required: true }) avifSrc!: string;

  /** Ruta al archivo WebP (opcional). Si no se provee, no se añade source WebP. */
  @Input() webpSrc?: string;

  /** Ruta al archivo de fallback (JPEG/PNG). Si no se provee, usa avifSrc como fallback. */
  @Input() fallbackSrc?: string;

  /** Texto alternativo para accesibilidad. */
  @Input() alt = '';

  /** Modo fill: cubre el contenedor padre (el padre debe tener position: relative). */
  @Input() fill = false;

  /** Imagen de alta prioridad (LCP): desactiva lazy loading y añade fetchpriority="high". */
  @Input() priority = false;

  /** Ancho intrínseco en píxeles (ignorado en modo fill). */
  @Input() width?: number;

  /** Alto intrínseco en píxeles (ignorado en modo fill). */
  @Input() height?: number;

  @HostBinding('class.jsl-picture--fill') get isFill() { return this.fill; }

  resolvedFallbackSrc = '';

  ngOnChanges(): void {
    this.resolvedFallbackSrc = this.fallbackSrc || this.avifSrc;
  }
}
