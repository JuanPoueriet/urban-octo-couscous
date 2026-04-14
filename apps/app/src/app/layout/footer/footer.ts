// src/app/layout/footer/footer.ts
import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '@core/services/api.service'; // 1. Importar ApiService
import { finalize } from 'rxjs/operators'; // 2. Importar finalize
import { LanguageSwitcher } from '@app/layout/language-switcher';

@Component({
  selector: 'jsl-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LucideAngularModule, ReactiveFormsModule, LanguageSwitcher],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer implements OnInit {
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  private apiService = inject(ApiService); // 3. Inyectar ApiService

  public currentYear = new Date().getFullYear();
  public currentLang = signal(this.translate.currentLang || this.translate.defaultLang || 'es');

  newsletterForm!: FormGroup;
  isSubmitting = signal(false);
  submitSuccess = signal(false);
  submitError = signal(false);

  constructor() {
    this.translate.onLangChange.subscribe((event) => {
      this.currentLang.set(event.lang);
    });
  }

  ngOnInit(): void {
    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get nf() {
    return this.newsletterForm.controls;
  }

  // 4. onSubmit actualizado para usar ApiService
  onSubmit(): void {
    if (this.newsletterForm.invalid) {
      this.newsletterForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitSuccess.set(false);
    this.submitError.set(false);

    // 5. Usar el ApiService en lugar de setTimeout
    this.apiService
      .subscribeToNewsletter(this.newsletterForm.value.email)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false); // Se ejecuta al completar o fallar
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('Suscripción exitosa:', response);
          this.submitSuccess.set(true);
          this.newsletterForm.reset();

          setTimeout(() => this.submitSuccess.set(false), 3000);
        },
        error: (err: any) => {
          console.error('Error al suscribir:', err);
          this.submitError.set(true);
          setTimeout(() => this.submitError.set(false), 3000);
        },
      });
  }
}
