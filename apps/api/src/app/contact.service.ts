import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { ContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly mailService: MailService) {}

  async handleContactForm(formData: ContactDto) {
    this.logger.log(`Receiving contact form: ${JSON.stringify(formData)}`);

    // Simple honeypot check
    if (formData.honeypot) {
      this.logger.warn(`Potential bot submission detected: ${formData.email}`);
      return {
        success: true,
        message: 'Message received successfully'
      };
    }

    try {
      await this.mailService.sendContactEmail(formData);
      return {
        success: true,
        message: 'Message received and email sent successfully'
      };
    } catch (error) {
      this.logger.error('Failed to send contact email', error);
      return {
        success: false,
        message: 'Message received but failed to notify team'
      };
    }
  }

  async handleNewsletterSubscription(email: string) {
    this.logger.log(`New newsletter subscription: ${email}`);
    // Here you would typically add to a mailing list
    return {
      success: true,
      message: 'Subscribed successfully'
    };
  }
}
