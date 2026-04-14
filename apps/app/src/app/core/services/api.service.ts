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
   * Simula el envío de un formulario de contacto.
   * @param formData Los datos del formulario (nombre, email, servicio, mensaje)
   */
  sendContactForm(formData: any): Observable<ApiResponse> {
    console.log('ApiService: Enviando formulario de contacto...', formData);
    
    // Simulación de una llamada API (1.5 segundos de retraso)
    // En un futuro, reemplazarías 'of(...)' con 'this.http.post<ApiResponse>(...)'
    return of({ 
      success: true, 
      message: 'Formulario enviado' 
    }).pipe(delay(1500));
    
    // --- Ejemplo de un error simulado (para probar) ---
    // return throwError(() => new Error('Error de simulación'))
    //   .pipe(delay(1500));
  }

  /**
   * Simula la suscripción a un newsletter.
   * @param email El email a suscribir
   */
  subscribeToNewsletter(email: string): Observable<ApiResponse> {
    console.log('ApiService: Suscribiendo al newsletter...', email);

    // Simulación de una llamada API (1 segundo de retraso)
    return of({ 
      success: true, 
      message: 'Suscripción exitosa' 
    }).pipe(delay(1000));
  }
}