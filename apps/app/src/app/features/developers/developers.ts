import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CodeBlockComponent } from '@shared/components/code-block/code-block';
import { CtaComponent } from '@shared/components/cta/cta';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'jsl-developers',
  standalone: true,
  imports: [CommonModule, TranslateModule, CodeBlockComponent, CtaComponent, RouterLink],
  templateUrl: './developers.html',
  styleUrl: './developers.scss'
})
export class Developers {
  exampleCode = `
import { VirtexClient } from '@virtex/sdk';

const client = new VirtexClient({
  apiKey: 'vtx_live_51M...',
});

// Create a new invoice
const invoice = await client.invoices.create({
  customer: 'cus_123',
  amount: 2500,
  currency: 'usd',
  items: [{ description: 'Consulting', quantity: 5 }]
});

console.log(invoice.id);
  `.trim();
}
