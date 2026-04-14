import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-events',
  standalone: true,
  imports: [CommonModule, TranslateModule, CtaComponent],
  templateUrl: './events.html',
  styleUrl: './events.scss'
})
export class Events {
  upcomingEvents = [
    {
      title: 'Virteex ERP 2.0 Demo',
      date: 'Nov 15, 2024 - 2:00 PM EST',
      description: 'See the new features of our flagship ERP system in action.',
      image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800'
    },
    {
      title: 'Cloud Security Masterclass',
      date: 'Dec 05, 2024 - 11:00 AM EST',
      description: 'Best practices for securing your infrastructure on AWS and Azure.',
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
    }
  ];

  pastEvents = [
    {
      title: 'Scaling Node.js Microservices',
      date: 'Oct 10, 2024',
      image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800'
    }
  ];
}
