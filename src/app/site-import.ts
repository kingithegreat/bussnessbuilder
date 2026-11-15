import { AppState, DEFAULT_PAGE_TEXT } from './types';
import { defaultState } from './default-state';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
type ObjectValue = Record<string, unknown>;
function object(value: unknown): value is ObjectValue { return !!value && typeof value === 'object' && !Array.isArray(value); }
function fail(): never { throw new Error('The file does not contain a valid BusinessFlow website export.'); }
function mergeKnown(base: ObjectValue, value: unknown): ObjectValue {
  if (value === undefined) return structuredClone(base);
  if (!object(value)) return fail();
  const result = structuredClone(base);
  for (const key of Object.keys(base)) {
    const v = value[key]; if (v === undefined) continue;
    const original = base[key];
    if (Array.isArray(original)) { if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) return fail(); result[key] = v; }
    else if (typeof v !== typeof original || (typeof v === 'number' && !Number.isFinite(v))) return fail();
    else result[key] = v;
  }
  return result;
}
function optionalStrings(result: ObjectValue, value: ObjectValue, keys: string[]) {
  for (const key of keys) if (value[key] !== undefined) { if (typeof value[key] !== 'string') fail(); result[key] = value[key]; }
}
function collection(value: unknown, defaults: ObjectValue, optional: string[] = []): ObjectValue[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 1000) return fail();
  const ids = new Set<string>();
  return value.map(v => {
    if (!object(v) || typeof v['id'] !== 'string' || !v['id'] || ids.has(v['id'])) return fail();
    ids.add(v['id']); const result = mergeKnown(defaults, v); optionalStrings(result,v,optional); return result;
  });
}

/** Validate before touching the editor; accept older partial website exports safely. */
export function parseSiteImport(json: string): AppState | null {
  try {
    if (new TextEncoder().encode(json).byteLength > MAX_IMPORT_BYTES) return null;
    const parsed: unknown = JSON.parse(json);
    if (!object(parsed)) return null;
    const source = parsed['businessData'] === undefined ? parsed : parsed['businessData'];
    if (!object(source) || !object(source['profile'])) return null;
    const profile = mergeKnown(defaultState.profile as unknown as ObjectValue,source['profile']);
    optionalStrings(profile,source['profile'],['currency','gstNumber']);
    if (profile['currency'] !== undefined && !['','NZD','AUD','USD','GBP','EUR'].includes(String(profile['currency']))) return null;
    if (!['','cleaner','barber','personal trainer','tutor','lawn mowing','mechanic','rental','cafe','consultant','shop','other'].includes(String(profile['type']))) return null;
    if (source['profile']['pricesIncludeGst'] !== undefined) { if(typeof source['profile']['pricesIncludeGst']!=='boolean')return null;profile['pricesIncludeGst']=source['profile']['pricesIncludeGst']; }
    const raw = source['customization']; if (raw !== undefined && !object(raw)) return null;
    const customization = raw as ObjectValue | undefined;
    const branding = mergeKnown(defaultState.customization.branding,customization?.['branding']);
    if (customization?.['branding'] && object(customization['branding'])) optionalStrings(branding,customization['branding'],['backgroundImageUrl','seoTitle','seoDescription','ogImageUrl']);
    const sections = customization?.['sections'] === undefined ? structuredClone(defaultState.customization.sections) : collection(customization['sections'],{id:'',visible:true,order:0,heading:'',subheading:''},['type','layoutVariant','imageUrl','content']);
    const fields = customization?.['formFields'] === undefined ? structuredClone(defaultState.customization.formFields) : collection(customization['formFields'],{id:'',label:'',type:'text',required:false,options:'',order:0},['placeholder','helperText']);
    if (customization?.['formFields'] !== undefined) {
      const sourceFields = customization['formFields'] as ObjectValue[];
      for (let i=0;i<fields.length;i++) {
        const f=fields[i] as unknown as ObjectValue;
        if (!['text','email','phone','number','textarea','dropdown','multi-select','checkbox','radio','date','time','file','address','budget','contact-method'].includes(String(f['type']))) return null;
        const dep=sourceFields[i]['dependsOn'];
        if(dep!==undefined){if(!object(dep)||typeof dep['fieldId']!=='string'||typeof dep['value']!=='string')return null;f['dependsOn']={fieldId:dep['fieldId'],value:dep['value']};}
      }
    }
    const text=customization?.['text']===undefined?undefined:mergeKnown(DEFAULT_PAGE_TEXT,customization['text']);
    if(source['isSetupComplete']!==undefined&&typeof source['isSetupComplete']!=='boolean')return null;
    if(source['siteSlug']!==undefined&&typeof source['siteSlug']!=='string')return null;
    // Server-owned inbox records are preserved by DataService for signed-in owners.
    // Legacy standalone exports retain their arrays for read-only/local round trips.
    const enquiries=source['enquiries']===undefined?[]:source['enquiries'],activities=source['activities']===undefined?[]:source['activities'];
    if(!Array.isArray(enquiries)||!Array.isArray(activities)||enquiries.length>1000||activities.length>1000||enquiries.some(v=>!object(v)||typeof v['id']!=='string')||activities.some(v=>!object(v)||typeof v['id']!=='string'))return null;
    return {profile,services:collection(source['services'],{id:'',name:'',description:''},['price','duration','imageUrl']),testimonials:collection(source['testimonials'],{id:'',author:'',rating:5,text:''},['role']),faqs:collection(source['faqs'],{id:'',question:'',answer:''}),enquiries,activities,themeSettings:mergeKnown({...defaultState.themeSettings},source['themeSettings']),customization:{branding,sections,formFields:fields,rules:mergeKnown(defaultState.customization.rules,customization?.['rules']),...(text?{text}:{})},isSetupComplete:source['isSetupComplete']??false,...(typeof source['siteSlug']==='string'?{siteSlug:source['siteSlug']}:{})} as unknown as AppState;
  } catch { return null; }
}
