import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DocumentService, Document } from '../../services/document.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  documents: Document[] = [];
  loading = true;

  constructor(
    private documentService: DocumentService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading = true;
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load documents', err);
        this.loading = false;
      }
    });
  }

  burnDocument(id: string) {
    if (confirm('Are you sure you want to burn this document? It will become inaccessible.')) {
      this.documentService.deleteDocument(id).subscribe(() => {
        this.loadDocuments();
      });
    }
  }

  logout() {
    this.authService.logout();
  }
}
