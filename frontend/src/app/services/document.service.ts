import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

export interface Document {
  id: string;
  title: string;
  oneTimeLink: string;
  createdAt: string;
  expiresAt?: string;
  currentViews: number;
  maxViews?: number;
  isBurned: boolean;
  _count?: {
    views: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private get headers() {
    const token = this.authService.getToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  getDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>('/api/documents', this.headers);
  }

  deleteDocument(id: string) {
    return this.http.delete(`/api/documents/${id}`, this.headers);
  }

  uploadDocument(formData: FormData) {
    return this.http.post<any>('/api/documents/upload', formData, this.headers);
  }
}
