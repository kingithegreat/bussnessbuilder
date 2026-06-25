import { Directive, input, output } from '@angular/core';

@Directive({
  selector: '[appEditableText]',
  standalone: true,
  host: {
    '[attr.contenteditable]': 'appEditableText() || null',
    '[class.editable-text]': 'appEditableText()',
    '(blur)': 'onBlur($event)',
    '(keydown.enter)': 'onEnter($event)',
    '(paste)': 'onPaste($event)',
  },
})
export class EditableTextDirective {
  appEditableText = input(false);
  textChange = output<string>();

  onBlur(event: Event) {
    if (!this.appEditableText()) return;
    this.textChange.emit((event.target as HTMLElement).textContent?.trim() || '');
  }

  onEnter(event: Event) {
    if (!this.appEditableText()) return;
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }

  onPaste(event: ClipboardEvent) {
    if (!this.appEditableText()) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }
}
