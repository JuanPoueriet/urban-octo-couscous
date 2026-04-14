import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-life-at-jsl',
  standalone: true,
  imports: [CommonModule, TranslateModule, CtaComponent],
  templateUrl: './life-at-jsl.html',
  styleUrl: './life-at-jsl.scss'
})
export class LifeAtJsl {
  moments = [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800'
  ];

  benefits = [
    { title: 'Remote-First', desc: 'Work from anywhere in the world.' },
    { title: 'Health & Wellness', desc: 'Comprehensive insurance and gym memberships.' },
    { title: 'Continuous Learning', desc: 'Budget for courses, books, and conferences.' },
    { title: 'MacBook Pro', desc: 'Top of the line hardware for everyone.' }
  ];
}
