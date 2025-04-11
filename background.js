function isValidUrl(selectedText) {
  try {
    const url = new URL(selectedText);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

async function shortenUrl(url) {
  // Check if the URL is valid
  if (!isValidUrl(url)) {
    console.error("Invalid URL:", url);
    return null;
  }
  try {
    const response = await fetch("http://localhost:8080/api/shorten", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error("Error shortening URL:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.short_url;
  } catch (error) {
    console.error("Error shortening URL:", error);
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // get the action from the request
  const { action } = request;
  // check if the action is to shorten the URL
  if (action === "shortenUrl") {
    // get the URL from the request
    const { url } = request;
    shortenUrl(url).then((shortenedUrl) => {
      if (shortenedUrl) {
        sendResponse({ shortenedUrl });
      } else {
        sendResponse({ error: "Failed to shorten URL" });
      }
    });
  }
  return true; // Keep the message channel open for sendResponse
});

// Get user's selected text and shorten it when command is triggered
chrome.commands.onCommand.addListener((command) => {
  if (command === "shorten_selected_url_text") {
    handleTextSelection();
  }
})

async function handleTextSelection() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab || !currentTab.id) {
    console.error("No active tab found");
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ["content.js"],
    });

    const response = await chrome.tabs.sendMessage(currentTab.id, { action: "getSelectedText" });

    if (response && response.selectedText) {
      const selectedText = response.selectedText;
      const shortenedUrl = await shortenUrl(selectedText);

      if (shortenedUrl) {
        await chrome.tabs.sendMessage(currentTab.id, { action: "copyToClipboard", text: shortenedUrl });
      } else {
        console.error("Failed to shorten URL");
      }
    } else if (response && response.error) {
      console.error("Error getting selected text:", response.error);
    } else {
      console.error("No text selected");
    }
  } catch (error) {
    console.error("Error injecting content script or sending message:", error);
  }
}