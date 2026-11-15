import {TestBed} from '@angular/core/testing';
import {Storage} from '@angular/fire/storage';
import {vi} from 'vitest';
import {StorageService,STORAGE_UPLOAD_SDK} from './storage.service';
describe('Image upload completion',()=>{
 let complete:()=>Promise<void>;const sdk={ref:vi.fn(()=>({})),getDownloadURL:vi.fn(),uploadBytesResumable:vi.fn(()=>({snapshot:{ref:{}},on:(_event:string,_progress:unknown,_error:unknown,done:()=>Promise<void>)=>{complete=done}}))};
 beforeEach(()=>{vi.clearAllMocks();TestBed.configureTestingModule({providers:[StorageService,{provide:Storage,useValue:{}},{provide:STORAGE_UPLOAD_SDK,useValue:sdk}]})});
 it('rejects the upload and clears progress when retrieving its URL fails',async()=>{const service=TestBed.inject(StorageService);sdk.getDownloadURL.mockRejectedValueOnce(new Error('URL unavailable'));const pending=service.uploadImage('owner',new File(['x'],'x.jpg',{type:'image/jpeg'}),'hero');expect(service.uploading()).toBe(true);const rejection=expect(pending).rejects.toThrow('URL unavailable');await complete();await rejection;expect(service.uploading()).toBe(false);expect(service.progress()).toBe(0)});
 it('resolves successful uploads and clears the busy indicator',async()=>{const service=TestBed.inject(StorageService);sdk.getDownloadURL.mockResolvedValueOnce('https://example.com/image.jpg');const pending=service.uploadImage('owner',new File(['x'],'x.jpg'),'hero');await complete();expect(await pending).toBe('https://example.com/image.jpg');expect(service.uploading()).toBe(false)});
});
