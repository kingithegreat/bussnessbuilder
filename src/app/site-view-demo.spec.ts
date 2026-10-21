import { Component, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { DataService } from './data.service';
import { PublicPageComponent } from './public-page.component';
import { SiteViewComponent } from './site-view.component';
import { PUBLIC_SITE_STATE_KEY } from './public-site-context';
import { defaultState } from './default-state';

@Component({ selector: 'app-public-page', standalone: true, template: 'Public site' })
class PublicPageStub {}

describe('SiteViewComponent demonstration disclosure', () => {
  const data = { profile: defaultState.profile, showcase: true };

  function setup(platform = 'browser', context: unknown = null) {
    const route = new BehaviorSubject(convertToParamMap({ uid: 'example' }));
    TestBed.configureTestingModule({
      imports: [SiteViewComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: REQUEST_CONTEXT, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: route } },
        { provide: DataService, useValue: { loadPublicSite: () => undefined } },
        { provide: HttpClient, useValue: { get: () => of(data) } },
      ],
    }).overrideComponent(SiteViewComponent, {
      remove: { imports: [PublicPageComponent] },
      add: { imports: [PublicPageStub] },
    });
    return { route, fixture: TestBed.createComponent(SiteViewComponent) };
  }

  it('renders fictional/shared-data warnings from SSR context and transfers the marker', () => {
    const { fixture } = setup('server', { publicSite: { uid: 'showcase', data } });
    fixture.detectChanges();
    const notice = fixture.nativeElement.querySelector('[data-testid="showcase-notice"]');
    expect(notice?.textContent).toContain('fictional examples');
    expect(notice?.textContent).toContain('visible to other demo users');
    expect(TestBed.inject(TransferState).get(PUBLIC_SITE_STATE_KEY, null)?.data.showcase).toBe(true);
  });

  it('preserves the notice on the first browser render from TransferState', () => {
    const { fixture } = setup();
    TestBed.inject(TransferState).set(PUBLIC_SITE_STATE_KEY, { uid: 'showcase', data });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="showcase-notice"]')).not.toBeNull();
  });

  it('does not carry a previous demonstration notice into an ordinary site', () => {
    const { fixture, route } = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="showcase-notice"]')).not.toBeNull();
    TestBed.inject(TransferState).set(PUBLIC_SITE_STATE_KEY, { uid: 'ordinary', data: { profile: defaultState.profile } });
    route.next(convertToParamMap({ uid: 'ordinary' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="showcase-notice"]')).toBeNull();
  });
});
