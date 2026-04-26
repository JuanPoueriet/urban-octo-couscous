import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { Seo } from '@core/services/seo';
import { Router } from '@angular/router';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ALL_ICONS } from '@core/constants/icons';

@Component({
  selector: 'jsl-contact',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, LucideAngularModule, AnimateOnScroll],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit, OnDestroy {
  contactForm!: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  readonly icons = ALL_ICONS;

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
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      service: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      privacy: [false, Validators.requiredTrue],
      honeypot: ['']
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() {
    return this.contactForm.controls;
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.toastService.show('CONTACT.FORM.ERROR', 'error');
      return;
    }

    // Honeypot check
    if (this.contactForm.value.honeypot) {
      console.warn('Bot detected via honeypot');
      this.submitSuccess = true;
      this.contactForm.reset();
      this.toastService.show('CONTACT.FORM.SUCCESS', 'success');
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = false;

    this.apiService
      .sendContactForm(this.contactForm.value)
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
          this.contactForm.reset();
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
}
