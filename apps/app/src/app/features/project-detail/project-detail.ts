import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // --- CAMBIO: Location se eliminará ---
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, Observable, of } from 'rxjs'; 
import { switchMap } from 'rxjs/operators'; 
import { DataService, Project } from '@core/services/data.service';
import { CtaComponent } from '@shared/components/cta/cta';
import { Title } from '@angular/platform-browser';
import { Seo } from '@core/services/seo';

@Component({
  selector: 'jsl-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule,
    CtaComponent 
  ],
  templateUrl: './project-detail.html'
})
export class ProjectDetail implements OnInit, OnDestroy {
  
  public currentLang: string = 'es';
  public project$: Observable<Project | undefined>; 
  
  private langSub: Subscription | undefined;
  private projectData: Project | undefined; 

  constructor(
    @Inject(TranslateService) private translate: TranslateService,
    private route: ActivatedRoute,
    private dataService: DataService, 
    private titleService: Title,
    private seoService: Seo
    // --- CAMBIO: 'Location' eliminado del constructor ---
  ) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';

    this.project$ = this.route.paramMap.pipe(
      switchMap(params => {
        const slug = params.get('slug');
        if (slug) {
          return this.dataService.getProjectBySlug(slug); 
        }
        return of(undefined);
      })
    );
  }

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang;
      this.updateTitle();
    });

    this.project$.subscribe(project => {
      this.projectData = project;
      this.updateTitle();
      if (project) this.updateMetadata(project);
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private updateTitle(): void {
    if (this.projectData) {
      const titleKey = `PROJECTS.${this.projectData.key}_TITLE`;
      this.translate.get(titleKey).subscribe(translatedTitle => {
        this.titleService.setTitle(`${translatedTitle} | JSL Technology`);
      });
    }
  }

  private updateMetadata(project: Project): void {
    const titleKey = `PROJECTS.${project.key}_TITLE`;
    const descKey = `PROJECTS.${project.key}_DESC`;
    const baseUrl = this.seoService.getBaseUrl();
    const url = `${baseUrl}/${this.currentLang}/projects/${project.slug}`;

    this.translate.get([titleKey, descKey, 'COMMON.BREADCRUMB_HOME', 'HEADER.PROJECTS']).subscribe(translations => {
      // --- Breadcrumbs Schema ---
      this.seoService.setBreadcrumbs([
        { name: translations['COMMON.BREADCRUMB_HOME'], item: `/${this.currentLang}/home` },
        { name: translations['HEADER.PROJECTS'], item: `/${this.currentLang}/projects` },
        { name: translations[titleKey], item: `/${this.currentLang}/projects/${project.slug}` }
      ]);

      this.seoService.updateCanonicalTag(url);
      this.seoService.updateSocialTags(
        translations[titleKey],
        translations[descKey],
        url,
        project.imageUrl
      );

      // --- CreativeWork Schema ---
      const projectSchema = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        'name': translations[titleKey],
        'description': translations[descKey],
        'image': project.imageUrl,
        'url': url,
        'author': {
          '@type': 'Organization',
          'name': 'JSL Technology'
        }
      };
      this.seoService.setJsonLd(projectSchema);
    });
  }

  // --- CAMBIO: Método 'goBack()' eliminado ---
}