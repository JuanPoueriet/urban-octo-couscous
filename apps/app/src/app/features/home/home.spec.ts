import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Play, ChevronLeft, ChevronRight, Award, ShieldCheck, TrendingDown, ThumbsUp, Search, ArrowRight, Download, Star, CheckCircle, FileText, Plus, Minus, Calendar, Clock, Compass, Code, Server, Smartphone, Monitor, Database, Cloud, TrendingUp, Rocket, Building, Building2, Zap, Lightbulb, HardDrive, Layers, ChevronsLeftRight, Calculator, DollarSign, Users } from 'lucide-angular';
import { BASE_URL } from '@core/constants/tokens';
import { provideZonelessChangeDetection } from '@angular/core';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Home,
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
        LucideAngularModule.pick({
          Play, ChevronLeft, ChevronRight, Award, ShieldCheck, TrendingDown, ThumbsUp, Search, ArrowRight, Download, Star, CheckCircle, FileText, Plus, Minus, Calendar, Clock, Compass, Code, Server, Smartphone, Monitor, Database, Cloud, TrendingUp, Rocket, Building, Building2, Zap, Lightbulb, HardDrive, Layers, ChevronsLeftRight, Calculator, DollarSign, Users
        })
      ],
      providers: [
        { provide: BASE_URL, useValue: 'http://localhost:4200' },
        provideZonelessChangeDetection()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
