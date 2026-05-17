import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  honeypot?: string;

  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
