/**
 * Copy text to the clipboard.
 *
 * Uses the async Clipboard API, falling back to a hidden textarea and
 * `document.execCommand('copy')` where the API is unavailable or refused
 * (the same fallback VitePress uses for its code-block copy buttons).
 *
 * @param text text to copy
 * @returns true when the text was copied
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithTextarea(text);
  }
}

function copyWithTextarea(text: string): boolean {
  const element = document.createElement('textarea');
  const previouslyFocused = document.activeElement;
  element.value = text;
  element.setAttribute('readonly', '');
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.fontSize = '12pt'; // prevents zoom on iOS
  document.body.appendChild(element);
  element.select();
  element.selectionStart = 0;
  element.selectionEnd = text.length;
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(element);
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  return copied;
}
