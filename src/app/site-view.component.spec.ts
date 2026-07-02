import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SiteViewComponent } from './site-view.component';
import { DataService } from './data.service';
import { PUBLIC_SITE_STATE_KEY } from './public-site-context';
import { PublicSiteData } from './types';

describe('SiteViewComponent — SSR request-context / TransferState hand-off', () => {
  const siteData = {
    profile: { name: 'Biz', type: 'Cleaning', email: 'a@b.c' },
  } as unknown as PublicSiteData;

  let loaded: { uid: string; data: PublicSiteData }[];
  let httpGets: string[];

  const dataStub = {
    loadPublicSite: (uid: string, data: PublicSiteData) => { loaded.push({ uid, data }); },
  };

  function makeComponent(platform: 'server' | 'browser', requestContext: unknown): SiteViewComponent {
    const httpStub = {
      get: (url: string) => { httpGets.push(url); return of(siteData); },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: dataStub },
        { provide: HttpClient, useValue: httpStub },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: REQUEST_CONTEXT, useValue: requestContext },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ uid: 'user-1' })) } },
      ],
    });
    return TestBed.createComponent(SiteViewComponent).componentInstance;
  }

  beforeEach(() => {
    loaded = [];
    httpGets = [];
  });

  it('server: renders the site from request context and serializes it to TransferState', () => {
    const component = makeComponent('server', { publicSite: { uid: 'user-1', data: siteData } });
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(false);
    expect(loaded).toEqual([{ uid: 'user-1', data: siteData }]);
    expect(httpGets).toEqual([]);
    expect(TestBed.inject(TransferState).get(PUBLIC_SITE_STATE_KEY, null))
      .toEqual({ uid: 'user-1', data: siteData });
  });

  it('server: keeps the loading shell when no context was provided (previous behaviour)', () => {
    const component = makeComponent('server', null);
    component.ngOnInit();
    expect(component.loading()).toBe(true);
    expect(loaded).toEqual([]);
    expect(httpGets).toEqual([]);
  });

  it('browser: reuses the transferred payload once instead of re-fetching', () => {
    const component = makeComponent('browser', null);
    TestBed.inject(TransferState).set(PUBLIC_SITE_STATE_KEY, { uid: 'resolved-uid', data: siteData });
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(loaded).toEqual([{ uid: 'resolved-uid', data: siteData }]);
    expect(httpGets).toEqual([]);
    // consumed: later navigations must fetch fresh
    expect(TestBed.inject(TransferState).hasKey(PUBLIC_SITE_STATE_KEY)).toBe(false);
  });

  it('browser: fetches from the API when nothing was transferred (previous behaviour)', () => {
    const component = makeComponent('browser', null);
    component.ngOnInit();
    expect(httpGets).toEqual(['/api/site/user-1']);
    expect(loaded).toEqual([{ uid: 'user-1', data: siteData }]);
    expect(component.loading()).toBe(false);
  });
});
