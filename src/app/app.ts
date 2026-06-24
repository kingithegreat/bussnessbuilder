import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {CookieConsentComponent} from './cookie-consent.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, CookieConsentComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
