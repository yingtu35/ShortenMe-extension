function getSelectedText() {
  const activeElement = document.activeElement;

  // Check if the active element is an input or textarea
  if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
    const input = activeElement;
    return input.value.substring(input.selectionStart, input.selectionEnd);
  }

  // Fallback to window.getSelection for text in the document body
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    return selection.toString();
  }

  return "";
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selectedText = getSelectedText();
    if (selectedText) {
      sendResponse({ selectedText });
    } else {
      sendResponse({ error: "No text selected" });
    }
  } else if (request.action === "copyToClipboard") {
    const text = request.text;
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.error("Error copying text to clipboard:", error);
      }
    }
  }
});