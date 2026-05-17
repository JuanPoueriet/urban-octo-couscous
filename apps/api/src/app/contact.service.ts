import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService
  ) {}

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

    const isRecaptchaValid = await this.verifyRecaptcha(formData.recaptchaToken);
    if (!isRecaptchaValid) {
      this.logger.warn(`reCAPTCHA validation failed for: ${formData.email}`);
      return {
        success: false,
        message: 'Captcha verification failed'
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

  private async verifyRecaptcha(token: string): Promise<boolean> {
    const secret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret || !token) {
      return false;
    }

    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token })
      });
      const data = await response.json() as { success?: boolean; score?: number; action?: string };
      return Boolean(data.success) && (data.score ?? 0) >= 0.5 && data.action === 'contact_form_submit';
    } catch (error) {
      this.logger.error('Failed to verify reCAPTCHA token', error as Error);
      return false;
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
