import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterModule } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ALL_ICONS } from '@core/constants/icons';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LucideAngularModule],
  templateUrl: './breadcrumbs.html',
  styleUrls: ['./breadcrumbs.scss']
})
export class BreadcrumbsComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [];
  readonly icons = ALL_ICONS;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      distinctUntilChanged()
    ).subscribe(() => {
      this.generateBreadcrumbs();
    });

    // Build initial
    this.generateBreadcrumbs();
  }

  private generateBreadcrumbs() {
    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);

    // Hide breadcrumbs on Home page to avoid redundancy
    if (this.breadcrumbs.length > 0) {
      const last = this.breadcrumbs[this.breadcrumbs.length - 1];
      if (last.label === 'HEADER.HOME') {
        this.breadcrumbs = [];
      }
    }
  }

  private buildBreadcrumbs(route: ActivatedRoute, url = '', breadcrumbs: Breadcrumb[] = []): Breadcrumb[] {
    // If no route config is available we are on the root of the app
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      // We allow the route data to specify a 'title' or we fallback to the path
      let label = child.snapshot.data['title'] || routeURL;

      // Handle dynamic routes like :slug
      if (routeURL.includes(':') || (child.snapshot.url.length > 0 && child.snapshot.routeConfig?.path?.startsWith(':'))) {
         // Try to find a meaningful label (e.g., store it in a service or use the slug format)
         // For now, we format the slug: 'my-solution' -> 'My Solution'
         const lastSegment = child.snapshot.url[child.snapshot.url.length - 1].path;
         label = lastSegment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      // Check if this breadcrumb is already present (e.g. for Home if redirected)
      const existing = breadcrumbs.find(b => b.url === url);

      if (!existing && label) {
          breadcrumbs.push({ label, url });
      }

      return this.buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }
}
