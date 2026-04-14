import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// Simulación de una respuesta exitosa de la API
export interface ApiResponse {
  success: boolean;
  message: string;
}

/**
 * Servicio para manejar todas las comunicaciones con un backend (POST, PUT, etc.).
 * Actualmente simula las respuestas de la API.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  private http = inject(HttpClient);

  constructor() { }

  /**
   * Envía el formulario de contacto al backend real.
   */
  sendContactForm(formData: any): Observable<ApiResponse> {
    console.log('ApiService: Enviando formulario de contacto...', formData);
    return this.http.post<ApiResponse>('/api/contact', formData);
  }

  /**
   * Suscribe a un newsletter en el backend real.
   */
  subscribeToNewsletter(email: string): Observable<ApiResponse> {
    console.log('ApiService: Suscribiendo al newsletter...', email);
    return this.http.post<ApiResponse>('/api/newsletter', { email });
  }
}