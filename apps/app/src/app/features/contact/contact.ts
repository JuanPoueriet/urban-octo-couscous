import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { Seo } from '@core/services/seo';
import { Router, RouterLink } from '@angular/router';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { Subject } from 'rxjs';
import { takeUntil, finalize, distinctUntilChanged } from 'rxjs/operators';
import { ALL_ICONS } from '@core/constants/icons';

@Component({
  selector: 'jsl-contact',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, LucideAngularModule, AnimateOnScroll, RouterLink],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit, OnDestroy {
  contactForm!: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  readonly icons = ALL_ICONS;
  private readonly recaptchaSiteKey = (globalThis as any).__env?.RECAPTCHA_SITE_KEY ?? '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastService: ToastService,
    private analytics: AnalyticsService,
    private router: Router,
    private seo: Seo
  ) {}

  ngOnInit(): void {
    this.seo.setOrganizationSchema();
    this.injectRecaptchaScript();
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[+()\-.\s\d]{7,20}$/)]],
      service: ['', [Validators.required]],
      serviceOther: [''],
      referralSource: [''],
      message: ['', [Validators.required, Validators.minLength(10)]],
      privacy: [false, Validators.requiredTrue],
      honeypot: [''],
      recaptchaToken: ['']
    });

    this.setupConditionalValidation();
  }

  private setupConditionalValidation(): void {
    const serviceControl = this.contactForm.get('service');
    const serviceOtherControl = this.contactForm.get('serviceOther');

    serviceControl?.valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((value: string) => {
        if (value === 'other') {
          serviceOtherControl?.setValidators([Validators.required, Validators.minLength(3)]);
        } else {
          serviceOtherControl?.clearValidators();
          serviceOtherControl?.setValue('');
        }

        serviceOtherControl?.updateValueAndValidity({ emitEvent: false });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() {
    return this.contactForm.controls;
  }

  async onSubmit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.toastService.show('CONTACT.FORM.ERROR', 'error');
      return;
    }

    // Honeypot check
    if (this.contactForm.value.honeypot) {
      console.warn('Bot detected via honeypot');
      this.submitSuccess = true;
      this.contactForm.reset({ privacy: false, serviceOther: '', referralSource: '', honeypot: '' });
      this.toastService.show('CONTACT.FORM.SUCCESS', 'success');
      return;
    }

    const recaptchaToken = await this.getRecaptchaToken();
    if (!recaptchaToken) {
      this.toastService.show('CONTACT.FORM.RECAPTCHA_ERROR', 'error');
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = false;

    this.apiService
      .sendContactForm({ ...this.contactForm.value, recaptchaToken })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta de API:', response);
          this.submitSuccess = true;
          this.contactForm.reset({ privacy: false, serviceOther: '', referralSource: '', honeypot: '' });
          this.toastService.show('CONTACT.FORM.SUCCESS', 'success');
          this.analytics.trackConversion('contact_form_submit');
          this.analytics.trackEvent('generate_lead', { method: 'contact_form' });
          this.router.navigate(['/thank-you']);
        },
        error: (err: any) => {
          console.error('Error al enviar formulario:', err);
          this.submitError = true;
          this.toastService.show('CONTACT.FORM.ERROR', 'error');
        },
      });
  }

  private async getRecaptchaToken(): Promise<string | null> {
    if (!this.recaptchaSiteKey || !(globalThis as any).grecaptcha?.execute) {
      return null;
    }

    try {
      return await (globalThis as any).grecaptcha.execute(this.recaptchaSiteKey, { action: 'contact_form_submit' });
    } catch {
      return null;
    }
  }

  private injectRecaptchaScript(): void {
    if (!this.recaptchaSiteKey) {
      return;
    }
    if (document.getElementById('recaptcha-enterprise-script')) {
      return;
    }
    const script = document.createElement('script');
    script.id = 'recaptcha-enterprise-script';
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(this.recaptchaSiteKey)}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
}
