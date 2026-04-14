import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ALL_ICONS } from '@core/constants/icons';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-roi-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './roi-calculator.component.html',
  styleUrls: ['./roi-calculator.component.scss']
})
export class RoiCalculatorComponent {
  readonly icons = ALL_ICONS;

  // ROI Calculator Signals
  hoursSaved = signal<number>(10);
  hourlyRate = signal<number>(50);
  employees = signal<number>(5);

  // Computed ROI
  weeklySavings = computed(() => this.hoursSaved() * this.hourlyRate() * this.employees());
  monthlySavings = computed(() => this.weeklySavings() * 4);
  annualSavings = computed(() => this.weeklySavings() * 52);

  // Formatting currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }
}
