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

export function isFormatActive(command, value = null) {
  if (command === 'formatBlock') {
    // Check if current block is blockquote
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    let node = selection.anchorNode;
    while (node) {
      if (node.nodeName === 'BLOCKQUOTE') return true;
      node = node.parentNode;
    }
    return false;
  }
  if (command === 'insertOrderedList' || command === 'insertUnorderedList') {
    return document.queryCommandState(command);
  }
  return document.queryCommandState(command);
}

export function isCodeBlockActive() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  let node = selection.anchorNode;
  while (node) {
    if (node.nodeType === 1 && node.classList && node.classList.contains('tf-code-block')) return true;
    node = node.parentNode;
  }
  return false;
} 