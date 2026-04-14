import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Card } from '@shared/components/card/card';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { DataService } from '@core/services/data.service';
import { CtaComponent } from '@shared/components/cta/cta';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PaginationComponent } from '@shared/components/pagination/pagination';

@Component({
  selector: 'jsl-blog',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    Card,
    AnimateOnScroll,
    CtaComponent,
    RouterLink,
    LucideAngularModule,
    PaginationComponent
  ],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Blog implements OnInit {
  private translate = inject(TranslateService);
  private dataService = inject(DataService);

  public currentLang: string;

  // Pagination settings
  public currentPage = signal(1);
  public itemsPerPage = 6;

  // 1. Señal base de todos los posts
  private allPosts = toSignal(this.dataService.getBlogPosts(), {
    initialValue: [],
  });

  // 2. Señales para los filtros
  public searchTerm = signal('');
  public selectedTag = signal<string | null>(null);

  // 3. Señal computada para obtener todos los tags únicos
  public allTags = computed(() => {
    const tags = this.allPosts().flatMap((post) => post.tags);
    return [...new Set(tags)]; // Devuelve un array de tags únicos
  });

  // 4. Señal computada para los posts filtrados
  private filteredPosts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const tag = this.selectedTag();

    // Reset pagination when filters change
    // Note: We can't set signals inside computed. We should handle this in the set methods.

    // Obtener claves de traducción para la búsqueda
    const titleKeys = this.allPosts().map((p) => `BLOG.${p.key}_TITLE`);
    const excerptKeys = this.allPosts().map((p) => `BLOG.${p.key}_EXCERPT`);
    const translations = this.translate.instant([...titleKeys, ...excerptKeys]);

    return this.allPosts().filter((post) => {
      // Búsqueda por Tag
      const tagMatch = !tag || post.tags.includes(tag);

      // Búsqueda por Término
      const title = translations[`BLOG.${post.key}_TITLE`]?.toLowerCase() || '';
      const excerpt = translations[`BLOG.${post.key}_EXCERPT`]?.toLowerCase() || '';
      const termMatch =
        term === '' || title.includes(term) || excerpt.includes(term);

      return tagMatch && termMatch;
    });
  });

  // 5. Señal computada para el artículo destacado (el primero que esté marcado y filtrado)
  public featuredPost = computed(() =>
    this.filteredPosts().find((p) => p.featured),
  );

  // 6. Señal computada para los posts regulares (todos menos el destacado)
  public regularPosts = computed(() => {
    const featured = this.featuredPost();
    if (featured) {
      return this.filteredPosts().filter((p) => p.slug !== featured.slug);
    }
    return this.filteredPosts(); // Si no hay destacado, mostrar todos
  });

  // 7. Paginated posts
  public paginatedPosts = computed(() => {
    const posts = this.regularPosts();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return posts.slice(startIndex, startIndex + this.itemsPerPage);
  });

  public totalItems = computed(() => this.regularPosts().length);

  constructor() {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  ngOnInit() {
    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
    });
  }

  // --- MÉTODOS PARA ACTUALIZAR FILTROS ---

  selectTag(tag: string | null): void {
    if (this.selectedTag() === tag) {
      this.selectedTag.set(null); // Deseleccionar
    } else {
      this.selectedTag.set(tag); // Seleccionar nuevo tag
    }
    this.currentPage.set(1);
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
