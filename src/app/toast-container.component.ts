import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in max-w-sm"
             [class]="toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'info' ? 'bg-gray-800 text-white' : 'bg-green-600 text-white'">
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastService.dismiss(toast.id)" class="text-white/70 hover:text-white transition-colors shrink-0">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in { animation: slide-in 0.2s ease-out; }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
