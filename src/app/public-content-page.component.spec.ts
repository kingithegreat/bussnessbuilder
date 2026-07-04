import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { PublicContentPageComponent } from './public-content-page.component';
import { PUBLIC_PAGE_STATE_KEY } from './public-site-context';

describe('PublicContentPageComponent — SSR request-context / TransferState hand-off', () => {
  const pageA = { slug: 'about', title: 'About', content: 'About body' };
  const pageB = { slug: 'faq', title: 'FAQ', content: 'FAQ body' };

  let httpGets: string[];
  let paramMap$: Subject<ReturnType<typeof convertToParamMap>>;

  function makeComponent(platform: 'server' | 'browser', requestContext: unknown, httpResponses: Record<string, { title: string; content: string; slug: string }>) {
    const httpStub = {
      get: (url: string) => {
        httpGets.push(url);
        const path = url.split('/pages/')[1];
        return of(httpResponses[path]);
      },
    };
    paramMap$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: httpStub },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: REQUEST_CONTEXT, useValue: requestContext },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            snapshot: { paramMap: convertToParamMap({ uid: 'user-1', slug: pageA.slug }) },
          },
        },
      ],
    });
    return TestBed.createComponent(PublicContentPageComponent).componentInstance;
  }

  beforeEach(() => {
    httpGets = [];
  });

  it('server: renders the page from request context and serializes it to TransferState', () => {
    const component = makeComponent('server', { publicPage: { uid: 'user-1', page: pageA } }, {});
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.page()).toEqual(pageA);
    expect(httpGets).toEqual([]);
    expect(TestBed.inject(TransferState).get(PUBLIC_PAGE_STATE_KEY, null))
      .toEqual({ uid: 'user-1', page: pageA });
  });

  it('server: keeps the loading shell when no context was provided (previous behaviour)', () => {
    const component = makeComponent('server', null, {});
    component.ngOnInit();
    expect(component.loading()).toBe(true);
    expect(component.page()).toBeNull();
    expect(httpGets).toEqual([]);
  });

  it('browser: reuses the transferred payload once instead of re-fetching', () => {
    const component = makeComponent('browser', null, {});
    TestBed.inject(TransferState).set(PUBLIC_PAGE_STATE_KEY, { uid: 'user-1', page: pageA });
    component.ngOnInit();
    paramMap$.next(convertToParamMap({ uid: 'user-1', slug: pageA.slug }));
    expect(component.loading()).toBe(false);
    expect(component.page()).toEqual(pageA);
    expect(httpGets).toEqual([]);
    expect(TestBed.inject(TransferState).hasKey(PUBLIC_PAGE_STATE_KEY)).toBe(false);
  });

  it('browser: fetches from the API when nothing was transferred (previous behaviour)', () => {
    const component = makeComponent('browser', null, { [`${pageA.slug}`]: pageA });
    component.ngOnInit();
    paramMap$.next(convertToParamMap({ uid: 'user-1', slug: pageA.slug }));
    expect(httpGets).toEqual([`/api/site/user-1/pages/${pageA.slug}`]);
    expect(component.page()).toEqual(pageA);
    expect(component.loading()).toBe(false);
  });

  it('browser: re-fetches on navigation to a different slug instead of staying stale (regression: was route.snapshot-only)', () => {
    const component = makeComponent('browser', null, { [pageA.slug]: pageA, [pageB.slug]: pageB });
    component.ngOnInit();
    paramMap$.next(convertToParamMap({ uid: 'user-1', slug: pageA.slug }));
    expect(component.page()).toEqual(pageA);

    // Client-side navigation to a sibling content page re-uses the component
    // instance and only fires a new paramMap emission — ngOnInit does NOT
    // run again. Before this fix, `page` would incorrectly stay pinned to
    // pageA because the fetch was keyed off a one-time route.snapshot read.
    paramMap$.next(convertToParamMap({ uid: 'user-1', slug: pageB.slug }));
    expect(component.page()).toEqual(pageB);
    expect(httpGets).toEqual([
      `/api/site/user-1/pages/${pageA.slug}`,
      `/api/site/user-1/pages/${pageB.slug}`,
    ]);
  });
});
