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

export function isCodeBlockActive(editorRef) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  let node = selection.anchorNode;
  // Only check inside the given editorRef
  if (editorRef && editorRef.current) {
    let insideEditor = false;
    let temp = node;
    while (temp) {
      if (temp === editorRef.current) {
        insideEditor = true;
        break;
      }
      temp = temp.parentNode;
    }
    if (!insideEditor) return false;
  }
  while (node) {
    if (node.nodeName === 'PRE' && node.classList && node.classList.contains('tf-code-block')) return true;
    node = node.parentNode;
  }
  return false;
} 