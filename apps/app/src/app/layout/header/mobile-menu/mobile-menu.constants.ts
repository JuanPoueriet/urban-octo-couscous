export interface MobileMenuLink {
  key: string;
  route?: any[];
  href?: string;
  icon: string;
  external?: boolean;
}

export interface MobileMenuSectionData {
  id: string;
  titleKey: string;
  links: MobileMenuLink[];
}

export function getMobileMenuSections(currentLang: string): MobileMenuSectionData[] {
  return [
    {
      id: 'top-tasks',
      titleKey: 'HEADER.TOP_TASKS',
      links: [
        { key: 'HEADER.VIEW_ALL_SERVICES', route: [currentLang, 'solutions'], icon: 'LayoutGrid' },
        { key: 'HEADER.VIEW_ALL_PRODUCTS', route: [currentLang, 'products'], icon: 'Package' },
        { key: 'HEADER.PROJECTS', route: [currentLang, 'projects'], icon: 'Lightbulb' },
        { key: 'HEADER.BLOG', route: [currentLang, 'blog'], icon: 'Newspaper' },
      ]
    },
    {
      id: 'services',
      titleKey: 'HEADER.SERVICES',
      links: [
        { key: 'SERVICES_LIST.WEB', route: [currentLang, 'solutions', 'web-development'], icon: 'Monitor' },
        { key: 'SERVICES_LIST.MOBILE', route: [currentLang, 'solutions', 'mobile-apps'], icon: 'Smartphone' },
        { key: 'SERVICES_LIST.DESKTOP', route: [currentLang, 'solutions', 'desktop-software'], icon: 'Laptop' },
        { key: 'SERVICES_LIST.CLOUD', route: [currentLang, 'solutions', 'cloud-architecture'], icon: 'CloudCog' },
        { key: 'HEADER.INDUSTRIES', route: [currentLang, 'industries'], icon: 'Building2' },
      ]
    },
    {
      id: 'products',
      titleKey: 'HEADER.PRODUCTS',
      links: [
        { key: 'PRODUCTS_LIST.ERP', href: 'https://virtex.com', icon: 'ExternalLink' },
        { key: 'PRODUCTS_LIST.POS', href: 'https://pos.jsl.technology', icon: 'ExternalLink' },
        { key: 'PRODUCTS_LIST.MOBILE', href: 'https://apps.jsl.technology', icon: 'ExternalLink' },
        { key: 'HEADER.VIRTEEX_ECOSYSTEM', route: [currentLang, 'virteex-ecosystem'], icon: 'Layers' },
        { key: 'HEADER.PRICING', route: [currentLang, 'pricing'], icon: 'CircleDollarSign' },
      ]
    },
    {
      id: 'company',
      titleKey: 'FOOTER.COMPANY',
      links: [
        { key: 'HEADER.ABOUT', route: [currentLang, 'about-us'], icon: 'Users' },
        { key: 'HEADER.PROCESS', route: [currentLang, 'process'], icon: 'Workflow' },
        { key: 'HEADER.TECH_STACK', route: [currentLang, 'tech-stack'], icon: 'Cpu' },
        { key: 'HEADER.CAREERS', route: [currentLang, 'careers'], icon: 'Briefcase' },
        { key: 'HEADER.PARTNERS', route: [currentLang, 'partners'], icon: 'Users' },
        { key: 'HEADER.LIFE_AT_JSL', route: [currentLang, 'life-at-jsl'], icon: 'Heart' },
        { key: 'HEADER.INVESTORS', route: [currentLang, 'investors'], icon: 'TrendingUp' },
        { key: 'HEADER.VENTURES', route: [currentLang, 'ventures'], icon: 'Rocket' },
        { key: 'HEADER.SECURITY', route: [currentLang, 'security'], icon: 'ShieldCheck' },
      ]
    },
    {
      id: 'resources',
      titleKey: 'FOOTER.RESOURCES',
      links: [
        { key: 'HEADER.PROJECTS', route: [currentLang, 'projects'], icon: 'Lightbulb' },
        { key: 'HEADER.BLOG', route: [currentLang, 'blog'], icon: 'Newspaper' },
        { key: 'HEADER.EVENTS', route: [currentLang, 'events'], icon: 'CalendarDays' },
        { key: 'HEADER.NEWS', route: [currentLang, 'news'], icon: 'Radio' },
        { key: 'HEADER.PRESS', route: [currentLang, 'press'], icon: 'BookOpen' },
        { key: 'HEADER.ROADMAP', route: [currentLang, 'roadmap'], icon: 'Map' },
        { key: 'HEADER.FAQ', route: [currentLang, 'faq'], icon: 'HelpCircle' },
        { key: 'HEADER.DEVELOPERS', route: [currentLang, 'developers'], icon: 'Code' },
      ]
    },
    {
      id: 'login',
      titleKey: 'HEADER.LOGIN',
      links: [
        { key: 'HEADER.LOGIN_VIRTEEX', href: 'https://app.virtex.com', icon: 'ExternalLink' },
        { key: 'HEADER.LOGIN_CLIENT', href: 'https://portal.jsl.technology', icon: 'ExternalLink' },
        { key: 'HEADER.LOGIN_SUPPORT', href: 'https://support.jsl.technology', icon: 'ExternalLink' },
      ]
    }
  ];
}
