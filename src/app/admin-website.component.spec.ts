import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AdminWebsiteComponent, WEBSITE_TOOLS } from './admin-website.component';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

describe('Website workspace', () => {
  const complete = signal(true);
  const slug = signal('apex');
  beforeEach(() => {
    TestBed.resetTestingModule(); complete.set(true); slug.set('apex');
    TestBed.configureTestingModule({ imports: [AdminWebsiteComponent], providers: [provideRouter([]),
      { provide: DataService, useValue: { isSetupComplete: complete, siteSlug: slug } },
      { provide: AuthService, useValue: { currentUser: () => ({ uid: 'owner' }) } },
    ] });
  });
  it('renders real links for every existing website tool without triggering changes', () => {
    const fixture = TestBed.createComponent(AdminWebsiteComponent); fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    WEBSITE_TOOLS.forEach(tool => expect(links.some(link => link.getAttribute('href') === tool.route && link.textContent?.includes(tool.title))).toBe(true));
    expect(links.some(link => link.getAttribute('href') === '/site/apex')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Draft or Published');
  });
  it('offers setup preview instead of claiming an incomplete site is live', () => {
    complete.set(false); const fixture = TestBed.createComponent(AdminWebsiteComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/setup"]').textContent).toContain('Continue setup and preview');
    expect(fixture.nativeElement.textContent).not.toContain('Your initial website is published');
    expect(fixture.nativeElement.querySelector('a[target="_blank"]')).toBeNull();
  });
  it('falls back to the authenticated public identity when no friendly slug exists', () => {
    slug.set(''); const fixture = TestBed.createComponent(AdminWebsiteComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[target="_blank"]').getAttribute('href')).toBe('/site/owner');
  });
});
