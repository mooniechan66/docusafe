import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'docusafe_token';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      // We could decode the token here to get user info
      this.currentUserSubject.next({ token }); 
    }
  }

  login(credentials: any) {
    return this.http.post<any>('/auth/login', credentials).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  signup(data: any) {
    return this.http.post<any>('/auth/register', data);
  }
  
  verify(token: string) {
    return this.http.get<any>(`/auth/verify?token=${token}`);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    window.location.href = '/login';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
