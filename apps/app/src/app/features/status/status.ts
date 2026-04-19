import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-status',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, CtaComponent],
  templateUrl: './status.html',
  styleUrl: './status.scss'
})
export class Status {
  systems = [
    { name: 'virtex Cloud Platform', uptime: 99.99 },
    { name: 'JSL API Gateway', uptime: 100 },
    { name: 'Auth Service', uptime: 100 },
    { name: 'Website & Documentation', uptime: 100 },
    { name: 'Billing System', uptime: 99.95 }
  ];

  incidents = [
    {
      date: 'Oct 15, 2024',
      title: 'Scheduled Maintenance',
      status: 'Resolved',
      desc: 'Routine database upgrades were performed successfully.'
    }
  ];
}
