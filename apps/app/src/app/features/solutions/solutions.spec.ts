import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BASE_URL } from '@core/constants/tokens';

import { Solutions } from './solutions';

describe('Solutions', () => {
  let component: Solutions;
  let fixture: ComponentFixture<Solutions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Solutions],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BASE_URL, useValue: 'https://test.com' }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Solutions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
