import { Routes } from '@angular/router';
import { languageInitGuard } from './core/guards/language-init-guard';
import { languageRedirectGuard } from './core/guards/language-redirect-guard';
import { RouteRedirectorComponent } from './core/components/route-redirector/route-redirector';

export const routes: Routes = [
  {
    path: ':lang',
    canActivate: [languageInitGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then(c => c.Home),
        data: {
          title: 'SEO.HOME_TITLE',
          description: 'SEO.HOME_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'solutions',
        data: {
          title: 'SEO.SOLUTIONS_TITLE',
          description: 'SEO.SOLUTIONS_DESC',
          robots: 'index, follow'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/solutions/solutions').then(c => c.Solutions),
          },
          {
            path: ':slug',
            loadComponent: () => import('./features/solution-detail/solution-detail').then(c => c.SolutionDetail),
            data: {
              title: 'dynamic',
              robots: 'index, follow'
            }
          }
        ]
      },
      {
        path: 'products',
        data: {
          title: 'SEO.PRODUCTS_TITLE',
          description: 'SEO.PRODUCTS_DESC',
          robots: 'index, follow'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/products/products').then(c => c.Products),
          },
          {
            path: ':slug',
            loadComponent: () => import('./features/product-detail/product-detail').then(c => c.ProductDetail),
            data: {
              title: 'dynamic',
              description: 'PRODUCTS.SUBTITLE',
              robots: 'index, follow'
            }
          }
        ]
      },
      {
        path: 'projects',
        data: { 
          title: 'SEO.PROJECTS_TITLE',
          description: 'SEO.PROJECTS_DESC',
          robots: 'index, follow'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/projects/projects').then(c => c.Projects),
          },
          {
            path: ':slug',
            loadComponent: () => import('./features/project-detail/project-detail').then(c => c.ProjectDetail),
            data: {
              title: 'dynamic',
              robots: 'index, follow'
            }
          }
        ]
      },
      {
        path: 'blog',
        data: {
          title: 'SEO.BLOG_TITLE',
          description: 'SEO.BLOG_DESC',
          robots: 'index, follow'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/blog/blog').then(c => c.Blog),
          },
          {
            path: ':slug',
            loadComponent: () => import('./features/blog-detail/blog-detail').then(c => c.BlogDetail),
            data: {
              title: 'dynamic',
              robots: 'index, follow'
            }
          }
        ]
      },
      {
        path: 'ventures',
        loadComponent: () => import('./features/ventures/ventures').then(c => c.Ventures),
        data: {
          title: 'SEO.VENTURES_TITLE',
          description: 'SEO.VENTURES_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'investors',
        loadComponent: () => import('./features/investors/investors').then(c => c.Investors),
        data: {
          title: 'SEO.INVESTORS_TITLE',
          description: 'SEO.INVESTORS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'virteex-ecosystem',
        loadComponent: () => import('./features/virteex-landing/virteex-landing').then(c => c.VirteexLanding),
        data: {
          title: 'SEO.VIRTEEX_TITLE',
          description: 'SEO.VIRTEEX_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'process',
        loadComponent: () => import('./features/process/process').then(c => c.Process),
        data: {
          title: 'SEO.PROCESS_TITLE',
          description: 'SEO.PROCESS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'industries',
        loadComponent: () => import('./features/industries/industries').then(c => c.Industries),
        data: {
          title: 'SEO.INDUSTRIES_TITLE',
          description: 'SEO.INDUSTRIES_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'tech-stack',
        loadComponent: () => import('./features/tech-stack/tech-stack').then(c => c.TechStack),
        data: { 
          title: 'SEO.TECH_STACK_TITLE',
          description: 'SEO.TECH_STACK_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'about-us',
        loadComponent: () => import('./features/about-us/about-us').then(c => c.AboutUs),
        data: {
          title: 'SEO.ABOUT_TITLE',
          description: 'SEO.ABOUT_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact').then(c => c.Contact),
        data: {
          title: 'SEO.CONTACT_TITLE',
          description: 'SEO.CONTACT_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'privacy-policy',
        loadComponent: () => import('./features/legal/privacy/privacy').then(c => c.Privacy),
        data: {
          title: 'SEO.PRIVACY_TITLE',
          description: 'SEO.PRIVACY_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'terms-of-service',
        loadComponent: () => import('./features/legal/terms/terms').then(c => c.Terms),
        data: {
          title: 'SEO.TERMS_TITLE',
          description: 'SEO.TERMS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'cookie-policy',
        loadComponent: () => import('./features/legal/cookie/cookie').then(c => c.Cookie),
        data: {
          title: 'SEO.COOKIE_TITLE',
          description: 'SEO.COOKIE_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'careers',
        loadComponent: () => import('./features/careers/careers').then(c => c.Careers),
        data: {
          title: 'SEO.CAREERS_TITLE',
          description: 'SEO.CAREERS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/faq/faq').then(c => c.Faq),
        data: {
          title: 'SEO.FAQ_TITLE',
          description: 'SEO.FAQ_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'partners',
        loadComponent: () => import('./features/partners/partners').then(c => c.Partners),
        data: {
          title: 'SEO.PARTNERS_TITLE',
          description: 'SEO.PARTNERS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news').then(c => c.News),
        data: {
          title: 'SEO.NEWS_TITLE',
          description: 'SEO.NEWS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'developers',
        loadComponent: () => import('./features/developers/developers').then(c => c.Developers),
        data: {
          title: 'SEO.DEVELOPERS_TITLE',
          description: 'SEO.DEVELOPERS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'roadmap',
        loadComponent: () => import('./features/roadmap/roadmap').then(c => c.Roadmap),
        data: {
          title: 'SEO.ROADMAP_TITLE',
          description: 'SEO.ROADMAP_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'events',
        loadComponent: () => import('./features/events/events').then(c => c.Events),
        data: {
          title: 'SEO.EVENTS_TITLE',
          description: 'SEO.EVENTS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'status',
        loadComponent: () => import('./features/status/status').then(c => c.Status),
        data: {
          title: 'SEO.STATUS_TITLE',
          description: 'SEO.STATUS_DESC',
          robots: 'noindex, follow'
        }
      },
      {
        path: 'life-at-jsl',
        loadComponent: () => import('./features/life-at-jsl/life-at-jsl').then(c => c.LifeAtJsl),
        data: {
          title: 'SEO.LIFE_AT_JSL_TITLE',
          description: 'SEO.LIFE_AT_JSL_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'press',
        loadComponent: () => import('./features/press/press').then(c => c.Press),
        data: {
          title: 'SEO.PRESS_TITLE',
          description: 'SEO.PRESS_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'pricing',
        loadComponent: () => import('./features/pricing/pricing').then(c => c.Pricing),
        data: {
          title: 'SEO.PRICING_TITLE',
          description: 'SEO.PRICING_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'security',
        loadComponent: () => import('./features/trust/trust').then(c => c.Trust),
        data: {
          title: 'SEO.SECURITY_TITLE',
          description: 'SEO.SECURITY_DESC',
          robots: 'index, follow'
        }
      },
      {
        path: 'server-error',
        loadComponent: () => import('./features/server-error/server-error').then(c => c.ServerError),
        data: {
          title: 'SEO.SERVER_ERROR_TITLE',
          description: 'SEO.SERVER_ERROR_DESC',
          robots: 'noindex, follow'
        }
      },
      {
        path: 'thank-you',
        loadComponent: () => import('./features/thank-you/thank-you').then(c => c.ThankYou),
        data: {
          title: 'SEO.THANK_YOU_TITLE',
          description: 'SEO.THANK_YOU_DESC',
          robots: 'noindex, follow'
        }
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      { 
        path: '**',
        loadComponent: () => import('./features/not-found/not-found').then(c => c.NotFound),
        data: { 
          title: 'SEO.NOT_FOUND_TITLE',
          description: 'SEO.NOT_FOUND_DESC',
          robots: 'noindex, follow'
        }
      }
    ]
  },
  {
    path: '',
    component: RouteRedirectorComponent,
    canActivate: [languageRedirectGuard],
    pathMatch: 'full'
  },
  {
    path: '**',
    component: RouteRedirectorComponent,
    canActivate: [languageRedirectGuard]
  }
];
