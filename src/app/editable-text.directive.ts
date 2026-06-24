import { Directive, input, output } from '@angular/core';

@Directive({
  selector: '[editableText]',
  standalone: true,
  host: {
    '[attr.contenteditable]': 'editableText() || null',
    '[class.editable-text]': 'editableText()',
    '(blur)': 'onBlur($event)',
    '(keydown.enter)': 'onEnter($event)',
    '(paste)': 'onPaste($event)',
  },
})
export class EditableTextDirective {
  editableText = input(false);
  textChange = output<string>();

  onBlur(event: Event) {
    if (!this.editableText()) return;
    this.textChange.emit((event.target as HTMLElement).textContent?.trim() || '');
  }

  onEnter(event: Event) {
    if (!this.editableText()) return;
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }

  onPaste(event: ClipboardEvent) {
    if (!this.editableText()) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }
}
