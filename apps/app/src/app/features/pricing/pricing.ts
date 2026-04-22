import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-pricing',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, CtaComponent],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss'
})
export class Pricing {
  step = 1;
  selections: any = {
    type: null,
    scale: null,
    features: []
  };

  types = [
    { id: 'web', name: 'PRICING.WEB_APP', basePrice: 10000 },
    { id: 'mobile', name: 'PRICING.MOBILE_APP', basePrice: 15000 },
    { id: 'erp', name: 'PRICING.CUSTOM_ERP', basePrice: 25000 }
  ];

  scales = [
    { id: 'startup', name: 'PRICING.STARTUP', multiplier: 1 },
    { id: 'smb', name: 'PRICING.SMB', multiplier: 1.5 },
    { id: 'enterprise', name: 'PRICING.ENTERPRISE', multiplier: 2.5 }
  ];

  features = [
    { id: 'design', name: 'PRICING.ADVANCED_UI', price: 5000 },
    { id: 'backend', name: 'PRICING.COMPLEX_BACKEND', price: 8000 },
    { id: 'cloud', name: 'PRICING.CLOUD_INFRA', price: 4000 },
    { id: 'ai', name: 'PRICING.AI_INTEGRATION', price: 10000 }
  ];

  comparison = [
    { feature: 'PRICING.CLOUD_NATIVE', virteex: true, others: false },
    { feature: 'PRICING.AI_INTEGRATION', virteex: true, others: 'PRICING.PAID_ADDON' },
    { feature: 'PRICING.SUPPORT_24_7', virteex: true, others: false },
    { feature: 'PRICING.CUSTOMIZABLE', virteex: true, others: true },
    { feature: 'PRICING.OPEN_API', virteex: true, others: false }
  ];

  estimatedPrice = 0;

  selectType(type: any) {
    this.selections.type = type;
    this.nextStep();
  }

  selectScale(scale: any) {
    this.selections.scale = scale;
    this.nextStep();
  }

  toggleFeature(feature: any) {
    const idx = this.selections.features.indexOf(feature);
    if (idx > -1) {
      this.selections.features.splice(idx, 1);
    } else {
      this.selections.features.push(feature);
    }
  }

  nextStep() {
    this.step++;
    if (this.step === 4) {
      this.calculate();
    }
  }

  calculate() {
    let total = this.selections.type.basePrice;
    total *= this.selections.scale.multiplier;
    this.selections.features.forEach((f: any) => total += f.price);
    this.estimatedPrice = total;
  }

  restart() {
    this.step = 1;
    this.selections = { type: null, scale: null, features: [] };
    this.estimatedPrice = 0;
  }
}
