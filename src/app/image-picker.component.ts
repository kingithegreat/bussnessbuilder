import { Component, inject, input, output, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { ImageSection, getStockImages } from './stock-images';

@Component({
  selector: 'app-image-picker',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="space-y-3">
      <div class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{{ label() }}</div>

      @if (currentUrl()) {
        <div class="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img [src]="currentUrl()" [alt]="label()" class="w-full h-40 object-cover" referrerpolicy="no-referrer">
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button (click)="showPicker.set(true)" class="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-gray-100">
              Change
            </button>
            <button (click)="removeImage()" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-red-600">
              Remove
            </button>
          </div>
        </div>
      } @else {
        <button (click)="showPicker.set(true)" class="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600">
          <mat-icon>add_photo_alternate</mat-icon>
          <span class="text-xs font-bold">Add Image</span>
        </button>
      }

      @if (showPicker()) {
        <div class="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <button type="button" aria-label="Close image picker" class="absolute inset-0 bg-black/50" (click)="showPicker.set(false)"></button>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 class="text-lg font-black text-gray-900">Choose Image</h3>
              <button (click)="showPicker.set(false)" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="flex gap-1 bg-gray-100 p-1 mx-5 mt-4 rounded-xl shrink-0">
              <button (click)="activeTab.set('stock')" class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      [class]="activeTab() === 'stock' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                Stock Photos
              </button>
              <button (click)="activeTab.set('upload')" class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      [class]="activeTab() === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                Upload
              </button>
              <button (click)="activeTab.set('url')" class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      [class]="activeTab() === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                URL
              </button>
            </div>

            <div class="flex-grow overflow-y-auto p-5">
              @if (activeTab() === 'stock') {
                <div class="grid grid-cols-2 gap-3">
                  @for (img of stockImages(); track img.url) {
                    <button (click)="selectImage(img.url)" class="group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors aspect-[4/3]">
                      <img [src]="img.url" [alt]="img.alt" class="w-full h-full object-cover" referrerpolicy="no-referrer" loading="lazy">
                      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p class="text-white text-[10px] font-medium truncate">Photo by {{ img.credit }}</p>
                      </div>
                    </button>
                  }
                </div>
                @if (stockImages().length === 0) {
                  <div class="text-center py-10 text-gray-400 text-sm">
                    No stock images available for this section.
                  </div>
                }
              }

              @if (activeTab() === 'upload') {
                <div class="space-y-4">
                  <label for="imageUploadInput" class="block w-full h-40 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600">
                    <mat-icon class="text-3xl">cloud_upload</mat-icon>
                    <span class="text-sm font-bold">Click to upload</span>
                    <span class="text-xs text-gray-400">JPG, PNG, WebP up to 5MB</span>
                    <input id="imageUploadInput" type="file" class="hidden" accept="image/jpeg,image/png,image/webp" (change)="onFileSelected($event)">
                  </label>

                  @if (storageService.uploading()) {
                    <div class="space-y-2">
                      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-600 rounded-full transition-all duration-300" [style.width.%]="storageService.progress()"></div>
                      </div>
                      <p class="text-xs text-gray-500 text-center font-medium">Uploading... {{ storageService.progress() }}%</p>
                    </div>
                  }

                  @if (uploadError()) {
                    <p class="text-red-500 text-sm text-center">{{ uploadError() }}</p>
                  }
                </div>
              }

              @if (activeTab() === 'url') {
                <div class="space-y-4">
                  <div>
                    <label for="imageUrlInput" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Image URL</label>
                    <input id="imageUrlInput" #urlInput type="url" placeholder="https://example.com/image.jpg" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <button (click)="selectImage(urlInput.value)" [disabled]="!urlInput.value" class="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    Use This Image
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ImagePickerComponent {
  readonly storageService = inject(StorageService);
  private authService = inject(AuthService);
  private dataService = inject(DataService);

  label = input('Image');
  section = input<ImageSection>('general');
  currentUrl = input<string>('');
  imageSelected = output<string>();

  showPicker = signal(false);
  activeTab = signal<'stock' | 'upload' | 'url'>('stock');
  uploadError = signal('');

  stockImages = computed(() => {
    const businessType = this.dataService.profile().type || 'other';
    return getStockImages(businessType, this.section());
  });

  selectImage(url: string) {
    if (!url) return;
    this.imageSelected.emit(url);
    this.showPicker.set(false);
  }

  removeImage() {
    this.imageSelected.emit('');
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('File too large. Max 5MB.');
      return;
    }

    this.uploadError.set('');
    const uid = this.authService.currentUser()?.uid;
    if (!uid) {
      this.uploadError.set('You must be signed in to upload images.');
      return;
    }

    try {
      const url = await this.storageService.uploadImage(uid, file, this.section());
      this.imageSelected.emit(url);
      this.showPicker.set(false);
    } catch (err: unknown) {
      this.uploadError.set(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }
}
