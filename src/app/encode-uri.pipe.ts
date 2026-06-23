import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'encodeURIComponent',
  standalone: true
})
export class EncodeUriComponentPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    return encodeURIComponent(value);
  }
}
