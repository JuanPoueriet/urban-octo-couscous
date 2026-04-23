import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, Mail } from 'lucide-angular';

import { CtaComponent } from './cta';

describe('CtaComponent', () => {
  let component: CtaComponent;
  let fixture: ComponentFixture<CtaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CtaComponent,
        LucideAngularModule.pick({ Mail }),
        TranslateModule.forRoot()
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
