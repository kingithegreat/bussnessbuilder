import { Component, ElementRef, ViewChild, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    @if (showCropper()) {
      <div class="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div class="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-bold text-gray-900 text-sm">Crop & Resize Image</h3>
            <button (click)="cancel()" class="text-gray-400 hover:text-gray-600">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="p-4 space-y-4">
            <div class="bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center" style="max-height: 400px;">
              <canvas #canvas class="max-w-full max-h-[400px]"></canvas>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quality</label>
              <input type="range" [(ngModel)]="quality" min="0.3" max="1" step="0.1" class="w-full accent-blue-600">
              <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Smaller file</span>
                <span>{{ (quality * 100).toFixed(0) }}%</span>
                <span>Higher quality</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Width (px)</label>
              <div class="flex gap-2">
                @for (w of widthPresets; track w) {
                  <button (click)="maxWidth = w; redraw()" [class.border-blue-500]="maxWidth === w" [class.bg-blue-50]="maxWidth === w" class="flex-1 py-1.5 border rounded-lg text-xs font-bold text-gray-700 transition-colors">{{ w }}</button>
                }
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-gray-100 flex justify-end gap-3">
            <button (click)="cancel()" class="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button (click)="apply()" class="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Apply</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ImageCropperComponent {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  showCropper = signal(false);
  cropped = output<Blob>();

  quality = 0.8;
  maxWidth = 1200;
  widthPresets = [600, 800, 1200, 1600];
  private originalImage: HTMLImageElement | null = null;

  open(file: File) {
    const img = new Image();
    img.onload = () => {
      this.originalImage = img;
      this.showCropper.set(true);
      setTimeout(() => this.redraw(), 50);
    };
    img.src = URL.createObjectURL(file);
  }

  openFromUrl(url: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.originalImage = img;
      this.showCropper.set(true);
      setTimeout(() => this.redraw(), 50);
    };
    img.src = url;
  }

  redraw() {
    if (!this.originalImage || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    let w = this.originalImage.naturalWidth;
    let h = this.originalImage.naturalHeight;

    if (w > this.maxWidth) {
      const ratio = this.maxWidth / w;
      w = this.maxWidth;
      h = Math.round(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(this.originalImage, 0, 0, w, h);
  }

  apply() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          this.cropped.emit(blob);
          this.showCropper.set(false);
        }
      },
      'image/jpeg',
      this.quality
    );
  }

  cancel() {
    this.showCropper.set(false);
    if (this.originalImage) {
      URL.revokeObjectURL(this.originalImage.src);
      this.originalImage = null;
    }
  }
}
