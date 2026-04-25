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
          title: 'SEO.HOME',
          description: 'HOME.HERO1_SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'solutions',
        data: {
          title: 'SEO.SERVICES',
          description: 'SOLUTIONS.SUBTITLE',
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
          title: 'SEO.PRODUCTS',
          description: 'PRODUCTS.SUBTITLE',
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
          title: 'SEO.PROJECTS',
          description: 'PROJECTS.SUBTITLE',
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
          title: 'SEO.BLOG',
          description: 'BLOG.SUBTITLE',
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
          title: 'SEO.VENTURES',
          description: 'VENTURES.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'investors',
        loadComponent: () => import('./features/investors/investors').then(c => c.Investors),
        data: {
          title: 'SEO.INVESTORS',
          description: 'INVESTORS.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'virteex-ecosystem',
        loadComponent: () => import('./features/virteex-landing/virteex-landing').then(c => c.VirteexLanding),
        data: {
          title: 'SEO.HOME', // Or VIRTEEX.TITLE if it's long enough, but SEO.HOME is a good fallback for main brand landing
          description: 'VIRTEEX.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'process',
        loadComponent: () => import('./features/process/process').then(c => c.Process),
        data: {
          title: 'SEO.PROCESS',
          description: 'PROCESS.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'industries',
        loadComponent: () => import('./features/industries/industries').then(c => c.Industries),
        data: {
          title: 'SEO.INDUSTRIES',
          description: 'INDUSTRIES.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'tech-stack',
        loadComponent: () => import('./features/tech-stack/tech-stack').then(c => c.TechStack),
        data: { 
          title: 'SEO.TECH_STACK',
          description: 'TECH_STACK.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'about-us',
        loadComponent: () => import('./features/about-us/about-us').then(c => c.AboutUs),
        data: {
          title: 'SEO.ABOUT',
          description: 'ABOUT.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact').then(c => c.Contact),
        data: {
          title: 'SEO.CONTACT',
          description: 'CONTACT.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'privacy-policy',
        loadComponent: () => import('./features/legal/privacy/privacy').then(c => c.Privacy),
        data: {
          title: 'SEO.PRIVACY',
          description: 'LEGAL.PRIVACY_INTRO',
          robots: 'index, follow'
        }
      },
      {
        path: 'terms-of-service',
        loadComponent: () => import('./features/legal/terms/terms').then(c => c.Terms),
        data: {
          title: 'SEO.TERMS',
          description: 'LEGAL.TERMS_SECTION_1_P1',
          robots: 'index, follow'
        }
      },
      {
        path: 'cookie-policy',
        loadComponent: () => import('./features/legal/cookie/cookie').then(c => c.Cookie),
        data: {
          title: 'SEO.COOKIE',
          description: 'LEGAL.COOKIE_INTRO',
          robots: 'index, follow'
        }
      },
      {
        path: 'careers',
        loadComponent: () => import('./features/careers/careers').then(c => c.Careers),
        data: {
          title: 'SEO.CAREERS',
          description: 'CAREERS.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/faq/faq').then(c => c.Faq),
        data: {
          title: 'SEO.FAQ',
          description: 'FAQ.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'partners',
        loadComponent: () => import('./features/partners/partners').then(c => c.Partners),
        data: {
          title: 'SEO.PARTNERS',
          description: 'PARTNERS_PAGE.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news').then(c => c.News),
        data: {
          title: 'SEO.HOME', // Fallback or a specific long title
          description: 'NEWS_PAGE.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'developers',
        loadComponent: () => import('./features/developers/developers').then(c => c.Developers),
        data: {
          title: 'SEO.DEVELOPERS',
          description: 'DEVELOPERS.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'roadmap',
        loadComponent: () => import('./features/roadmap/roadmap').then(c => c.Roadmap),
        data: {
          title: 'SEO.ROADMAP',
          description: 'ROADMAP.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'events',
        loadComponent: () => import('./features/events/events').then(c => c.Events),
        data: {
          title: 'SEO.EVENTS',
          description: 'EVENTS.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'status',
        loadComponent: () => import('./features/status/status').then(c => c.Status),
        data: {
          title: 'SEO.STATUS',
          description: 'STATUS.SUBTITLE',
          robots: 'noindex, follow'
        }
      },
      {
        path: 'life-at-jsl',
        loadComponent: () => import('./features/life-at-jsl/life-at-jsl').then(c => c.LifeAtJsl),
        data: {
          title: 'SEO.LIFE_AT_JSL',
          description: 'LIFE_AT_JSL.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'press',
        loadComponent: () => import('./features/press/press').then(c => c.Press),
        data: {
          title: 'SEO.HOME', // Fallback
          description: 'PRESS.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'pricing',
        loadComponent: () => import('./features/pricing/pricing').then(c => c.Pricing),
        data: {
          title: 'SEO.PRICING',
          description: 'PRICING.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'security',
        loadComponent: () => import('./features/trust/trust').then(c => c.Trust),
        data: {
          title: 'SEO.TRUST',
          description: 'TRUST_PAGE.SUBTITLE',
          robots: 'index, follow'
        }
      },
      {
        path: 'server-error',
        loadComponent: () => import('./features/server-error/server-error').then(c => c.ServerError),
        data: {
          title: 'SEO.SERVER_ERROR',
          description: 'ERRORS.500_DESC',
          robots: 'noindex, follow'
        }
      },
      {
        path: 'thank-you',
        loadComponent: () => import('./features/thank-you/thank-you').then(c => c.ThankYou),
        data: {
          title: 'SEO.THANK_YOU',
          description: 'THANK_YOU.MESSAGE',
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
          title: 'SEO.NOT_FOUND',
          description: 'NOT_FOUND.SUBTITLE',
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
