// Utility functions for formatting selection in a contenteditable div

export function format(command, value = null) {
  if (command === 'clearFormatting') {
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    document.execCommand('formatBlock', false, 'div');
    return;
  }
  document.execCommand(command, false, value);
}

export function isFormatActive(command) {
  return document.queryCommandState(command);
} 