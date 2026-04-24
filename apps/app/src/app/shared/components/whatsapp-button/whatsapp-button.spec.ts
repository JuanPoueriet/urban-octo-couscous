import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsAppButtonComponent } from './whatsapp-button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideZonelessChangeDetection } from '@angular/core';

describe('WhatsAppButtonComponent', () => {
  let component: WhatsAppButtonComponent;
  let fixture: ComponentFixture<WhatsAppButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsAppButtonComponent, TranslateModule.forRoot()],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhatsAppButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct WhatsApp link', () => {
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor.href).toContain('wa.me/18092641693');
  });

  it('should have target="_blank"', () => {
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor.target).toBe('_blank');
  });
});
