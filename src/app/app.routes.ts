import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LoginComponent } from './login.component';
import { SetupWizardComponent } from './setup.component';
import { PublicPageComponent } from './public-page.component';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminInboxComponent } from './admin-inbox.component';
import { AdminContentComponent } from './admin-content.component';
import { AdminAiToolsComponent } from './admin-ai.component';
import { AdminCustomisationComponent } from './admin-customisation.component';
import { AdminBuilderComponent } from './admin-builder.component';
import { AdminFormBuilderComponent } from './admin-form-builder.component';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { TermsComponent } from './terms.component';
import { PricingComponent } from './pricing.component';
import { AdminSettingsComponent } from './admin-settings.component';
import { AdminPagesComponent } from './admin-pages.component';
import { AdminPaymentsComponent } from './admin-payments.component';
import { ContentPageViewComponent } from './content-page-view.component';
import { authGuard, setupGuard, publicGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: LoginComponent },
  { path: 'privacy', component: PrivacyPolicyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'pricing', component: PricingComponent },
  { path: 'pages/:slug', component: ContentPageViewComponent },
  { path: 'setup', component: SetupWizardComponent, canActivate: [setupGuard] },
  { path: 'public', component: PublicPageComponent, canActivate: [publicGuard] },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'inbox', component: AdminInboxComponent },
      { path: 'content', component: AdminContentComponent },
      { path: 'ai', component: AdminAiToolsComponent },
      { path: 'customisation', component: AdminCustomisationComponent },
      { path: 'builder', component: AdminBuilderComponent },
      { path: 'form-builder', component: AdminFormBuilderComponent },
      { path: 'pages', component: AdminPagesComponent },
      { path: 'payments', component: AdminPaymentsComponent },
      { path: 'settings', component: AdminSettingsComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
