import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('contact')
  async sendContact(@Body() formData: any) {
    return this.contactService.handleContactForm(formData);
  }

  @Post('newsletter')
  async subscribeNewsletter(@Body('email') email: string) {
    return this.contactService.handleNewsletterSubscription(email);
  }
}
