import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { SetupWizardComponent } from './setup.component';
import { PublicPageComponent } from './public-page.component';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminInboxComponent } from './admin-inbox.component';
import { AdminAiToolsComponent } from './admin-ai.component';
import { AdminCustomisationComponent } from './admin-customisation.component';
import { AdminBuilderComponent } from './admin-builder.component';
import { AdminFormBuilderComponent } from './admin-form-builder.component';
import { authGuard, publicGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'setup', component: SetupWizardComponent },
  { path: 'public', component: PublicPageComponent, canActivate: [publicGuard] },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'inbox', component: AdminInboxComponent },
      { path: 'ai', component: AdminAiToolsComponent },
      { path: 'customisation', component: AdminCustomisationComponent },
      { path: 'builder', component: AdminBuilderComponent },
      { path: 'form-builder', component: AdminFormBuilderComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
