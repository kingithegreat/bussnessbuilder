import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] text-gray-900 flex flex-col font-sans">
      <header class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center w-full">
        <div class="flex items-center gap-2">
          <div class="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <mat-icon>business</mat-icon>
          </div>
          <span class="text-xl font-bold tracking-tight">BusinessFlow Studio</span>
        </div>
        <a routerLink="/setup" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm hover:shadow">
          Get Started
        </a>
      </header>
      
      <main class="flex-grow flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-24">
        <div class="bg-white rounded-[2rem] p-12 md:p-16 shadow-sm border border-gray-100 max-w-4xl mx-auto flex flex-col items-center">
          <div class="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 mb-8">
            <mat-icon class="text-3xl h-8 w-8">bolt</mat-icon>
          </div>
          <h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-gray-900 leading-tight">
            Your business, <br/>
            <span class="text-blue-600">ready in minutes.</span>
          </h1>
          <p class="text-lg md:text-xl text-gray-500 max-w-2xl mb-12">
            The ultimate all-in-one template for small businesses. Answer a few questions and instantly get a beautifully designed public page, an enquiry inbox, and AI-powered management tools.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <a routerLink="/setup" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2">
              Start the Setup Wizard
              <mat-icon>arrow_forward</mat-icon>
            </a>
          </div>
        </div>
      </main>
      
      <footer class="py-12 text-center text-gray-400 text-sm">
        <p>&copy; 2026 BusinessFlow Studio. A local-first prototype.</p>
      </footer>
    </div>
  `
})
export class LandingComponent {}
