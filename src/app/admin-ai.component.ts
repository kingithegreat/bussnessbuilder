import { Component, inject } from '@angular/core';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { ToastService } from './toast.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-ai-tools',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="mb-8">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">AI Content Tools</h2>
        <p class="text-gray-500 text-sm">Generate high-converting content for your business profile in seconds.</p>
      </div>

      <!-- Gemini API Key -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="font-bold text-gray-900 flex items-center gap-3">
            <div class="w-6 h-6 bg-purple-100 text-purple-600 rounded-md flex items-center justify-center">
              <mat-icon class="text-[14px]">key</mat-icon>
            </div>
            Gemini API Key
          </h3>
          @if (isLive()) {
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Live AI
            </span>
          } @else {
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Templates
            </span>
          }
        </div>
        <div class="p-6">
          <p class="text-[13px] text-gray-500 mb-3">
            Add your Google Gemini API key to generate real AI content. Without a key, the tools use built-in templates. The key is stored only in this browser and is never exported with your profile.
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" class="text-blue-600 font-medium hover:underline">Get a key</a>.
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <input type="password" [(ngModel)]="apiKeyInput" placeholder="Paste your Gemini API key..." autocomplete="off" class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
            <div class="flex gap-2">
              <button (click)="saveApiKey()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">Save Key</button>
              @if (isLive()) {
                <button (click)="clearApiKey()" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">Remove</button>
              }
            </div>
          </div>
          @if (keySaved) {
            <p class="text-green-600 text-xs font-medium mt-2">API key saved.</p>
          }
        </div>
      </div>

      <!-- Business Description -->
      <div class="bg-gray-900 rounded-2xl shadow-sm overflow-hidden flex flex-col mb-6">
        <div class="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
          <h3 class="font-bold text-white flex items-center gap-3">
            <div class="w-6 h-6 bg-gradient-to-tr from-blue-400 to-purple-400 rounded-md flex items-center justify-center">
               <mat-icon class="text-white text-[14px]">edit_document</mat-icon>
            </div>
            Business Description
          </h3>
          <button (click)="generateDesc()" [disabled]="isGeneratingDesc" class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
            @if(isGeneratingDesc) {
              <span class="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span> Generating...
            } @else {
              <mat-icon class="text-[14px]">auto_awesome</mat-icon> Generate
            }
          </button>
        </div>
        <div class="p-6">
          <textarea rows="5" [(ngModel)]="localDesc" class="w-full p-4 border border-gray-700 bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-100 font-sans text-sm shadow-inner"></textarea>
          <div class="mt-4 flex justify-end">
            <button (click)="saveDesc()" class="bg-white text-gray-900 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm hover:bg-gray-100">Save Description</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Google Business Profile -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="font-bold text-gray-900 flex items-center gap-3">
              <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center">
                 <mat-icon class="text-[14px]">storefront</mat-icon>
              </div>
              Google Business Post
            </h3>
          </div>
          <div class="p-6 flex-1 flex flex-col">
            <input type="text" [(ngModel)]="googleTopic" placeholder="What's the update about?" class="w-full px-4 py-2.5 mb-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
            <button (click)="generateGoogle()" [disabled]="!googleTopic || isGeneratingGoogle" class="w-full bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center gap-2 mb-4">
               @if(isGeneratingGoogle) {
                  <span class="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
               } @else {
                  <mat-icon class="text-[16px]">auto_awesome</mat-icon> Generate Post
               }
            </button>
            @if (googleDraft) {
               <textarea rows="4" [(ngModel)]="googleDraft" class="w-full p-3 border border-gray-200 rounded-xl outline-none text-gray-700 font-sans text-sm mb-4 flex-1 min-h-[100px]"></textarea>
               <button (click)="copyToClipboard(googleDraft)" class="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                 <mat-icon class="text-[16px]">content_copy</mat-icon> {{ copySuccess === 'google' ? 'Copied!' : 'Copy to Clipboard' }}
               </button>
            }
          </div>
        </div>
        
        <!-- Social Media Caption -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="font-bold text-gray-900 flex items-center gap-3">
              <div class="w-6 h-6 bg-pink-100 text-pink-600 rounded-md flex items-center justify-center">
                 <mat-icon class="text-[14px]">share</mat-icon>
              </div>
              FB / IG Caption
            </h3>
          </div>
          <div class="p-6 flex-1 flex flex-col">
            <input type="text" [(ngModel)]="socialTopic" placeholder="What's the post about?" class="w-full px-4 py-2.5 mb-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
            <button (click)="generateSocial()" [disabled]="!socialTopic || isGeneratingSocial" class="w-full bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center gap-2 mb-4">
               @if(isGeneratingSocial) {
                  <span class="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
               } @else {
                  <mat-icon class="text-[16px]">auto_awesome</mat-icon> Generate Caption
               }
            </button>
            @if (socialDraft) {
               <textarea rows="4" [(ngModel)]="socialDraft" class="w-full p-3 border border-gray-200 rounded-xl outline-none text-gray-700 font-sans text-sm mb-4 flex-1 min-h-[100px]"></textarea>
               <button (click)="copyToClipboard(socialDraft, 'social')" class="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                 <mat-icon class="text-[16px]">content_copy</mat-icon> {{ copySuccess === 'social' ? 'Copied!' : 'Copy to Clipboard' }}
               </button>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminAiToolsComponent {
  private dataService = inject(DataService);
  private aiService = inject(AiService);
  private toast = inject(ToastService);

  localDesc = this.dataService.profile().description;
  isGeneratingDesc = false;
  
  googleTopic = '';
  isGeneratingGoogle = false;
  googleDraft = '';
  
  socialTopic = '';
  isGeneratingSocial = false;
  socialDraft = '';
  
  copySuccess: 'google' | 'social' | null = null;

  apiKeyInput = this.dataService.geminiApiKey();
  keySaved = false;

  isLive = () => this.aiService.isLive();

  saveApiKey() {
    this.dataService.setGeminiApiKey(this.apiKeyInput);
    this.keySaved = true;
    setTimeout(() => this.keySaved = false, 2500);
  }

  clearApiKey() {
    this.apiKeyInput = '';
    this.dataService.setGeminiApiKey('');
  }

  async generateDesc() {
    this.isGeneratingDesc = true;
    this.localDesc = await this.aiService.generateBusinessDescription(this.dataService.profile());
    this.isGeneratingDesc = false;
  }

  async generateGoogle() {
    if (!this.googleTopic) return;
    this.isGeneratingGoogle = true;
    this.googleDraft = await this.aiService.generateGooglePost(this.dataService.profile(), this.googleTopic);
    this.isGeneratingGoogle = false;
  }

  async generateSocial() {
    if (!this.socialTopic) return;
    this.isGeneratingSocial = true;
    this.socialDraft = await this.aiService.generateSocialCaption(this.dataService.profile(), this.socialTopic);
    this.isGeneratingSocial = false;
  }

  async copyToClipboard(text: string, type: 'google' | 'social' = 'google') {
    try {
      await navigator.clipboard.writeText(text);
      this.copySuccess = type;
      setTimeout(() => this.copySuccess = null, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }

  saveDesc() {
    this.dataService.updateProfile({ description: this.localDesc });
    this.toast.success('Description saved successfully!');
  }
}
