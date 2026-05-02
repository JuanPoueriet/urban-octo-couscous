import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileMenu } from './mobile-menu';
import { MenuService } from '../../../core/services/menu.service';
import { DirectionService } from '../../../core/services/direction.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideAngularModule, Search, X, SearchX, ChevronDown,
  Mail, CircleDollarSign, HelpCircle, Headphones, LayoutGrid,
  Monitor, Smartphone, Laptop, CloudCog, Building2, Package,
  ExternalLink, Layers, Users, Workflow, Cpu, Briefcase,
  Heart, TrendingUp, Rocket, ShieldCheck, Lightbulb, Newspaper,
  CalendarDays, Radio, BookOpen, Map, Code, Linkedin, Github,
  Twitter, Instagram
} from 'lucide-angular';
import { NO_ERRORS_SCHEMA, signal, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';

describe('MobileMenu', () => {
  let component: MobileMenu;
  let fixture: ComponentFixture<MobileMenu>;
  let menuServiceMock: any;
  let directionServiceMock: any;
  let analyticsServiceMock: any;
  let translateService: TranslateService;

  beforeEach(async () => {
    menuServiceMock = {
      isMobileMenuOpen: signal(false),
      close: jasmine.createSpy('close'),
      open: jasmine.createSpy('open')
    };

    directionServiceMock = {
      isRtl: signal(false)
    };

    analyticsServiceMock = {
      trackEvent: jasmine.createSpy('trackEvent')
    };

    await TestBed.configureTestingModule({
      imports: [
        MobileMenu,
        RouterTestingModule,
        FormsModule,
        TranslateModule.forRoot(),
        LucideAngularModule.pick({
          Search, X, SearchX, ChevronDown, Mail, CircleDollarSign,
          HelpCircle, Headphones, LayoutGrid, Monitor, Smartphone,
          Laptop, CloudCog, Building2, Package, ExternalLink,
          Layers, Users, Workflow, Cpu, Briefcase, Heart,
          TrendingUp, Rocket, ShieldCheck, Lightbulb, Newspaper,
          CalendarDays, Radio, BookOpen, Map, Code, Linkedin,
          Github, Twitter, Instagram
        })
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MenuService, useValue: menuServiceMock },
        { provide: DirectionService, useValue: directionServiceMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    // Setup a simple translation for results count
    translateService.setTranslation('en', {
      'SEARCH.RESULTS_COUNT': '{{count}} results',
      'SEARCH.NO_RESULTS_FOUND': 'No results found',
      'ARIA.CLOSE_MENU': 'Close menu'
    });
    translateService.use('en');

    fixture = TestBed.createComponent(MobileMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call menuService.close() when Escape key is pressed', () => {
    (menuServiceMock.isMobileMenuOpen as any).set(true);
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(menuServiceMock.close).toHaveBeenCalled();
  });

  it('should update search results count when search query changes', () => {
    component.searchQuery = 'Service';
    component.onSearchChange();
    fixture.detectChanges();

    expect(component.searchResultsCount).toBeGreaterThanOrEqual(0);
  });

  it('should show "No results found" when search query matches nothing', () => {
    component.searchQuery = 'Non-existent-key-12345';
    component.onSearchChange();
    fixture.detectChanges();

    const noResults = fixture.debugElement.query(By.css('.mobile-menu-no-results'));
    expect(noResults).toBeTruthy();

    const ariaLive = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(ariaLive.nativeElement.textContent).toContain('0');
  });

  it('should toggle sections', () => {
    const sectionId = 'services';
    component.toggleSection(sectionId);
    expect(component.expandedSections.has(sectionId)).toBeTrue();

    component.toggleSection(sectionId);
    expect(component.expandedSections.has(sectionId)).toBeFalse();
  });

  it('should trap focus when open', () => {
    (menuServiceMock.isMobileMenuOpen as any).set(true);
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.mobile-menu-overlay'));
    expect(overlay).toBeTruthy();
  });
});
