import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Card } from '@shared/components/card/card';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { DataService } from '@core/services/data.service';
import { CtaComponent } from '@shared/components/cta/cta';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaginationComponent } from '@shared/components/pagination/pagination';

@Component({
  selector: 'jsl-projects',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    Card,
    AnimateOnScroll,
    CtaComponent,
    PaginationComponent
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss'
})
export class Projects implements OnInit {

  private translate = inject(TranslateService);
  private dataService = inject(DataService);

  public currentLang: string;
  public projects = toSignal(this.dataService.getProjects(), { initialValue: [] });
  
  public currentPage = signal(1);
  public itemsPerPage = 6;

  public paginatedProjects = computed(() => {
    const all = this.projects();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return all.slice(startIndex, startIndex + this.itemsPerPage);
  });

  constructor() {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  ngOnInit() {
    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
