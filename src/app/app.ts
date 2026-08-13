import {ChangeDetectionStrategy, Component, afterNextRender, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {CookieConsentComponent} from './cookie-consent.component';
import {ToastContainerComponent} from './toast-container.component';
import {FunnelService} from './funnel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, CookieConsentComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private funnel = inject(FunnelService);

  constructor() {
    // Register the page-lifecycle flush hooks once, browser-only. afterNextRender
    // never runs on the server, mirroring how CookieConsentComponent handles the
    // same concern.
    afterNextRender(() => this.funnel.installFlushHooks());
  }
}
