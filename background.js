const API_URL = "https://shortenme.link/api/shorten";

// Keep track of tabs we've already processed
let processedTabs = new Set();
let extensionEnabled = true;

function initOptions() {
  const initialOptions = {
    saveHistory: true,
    autoCreate: true,
    themeMode: 'system' // Default to system theme
  };
  chrome.storage.sync.set({ options: initialOptions });
}

function initHistory() {
  const initialHistory = [];
  chrome.storage.local.set({ urlHistory: initialHistory });
}

// Handle installation events
chrome.runtime.onInstalled.addListener((details) => {
  setupContextMenus();

  if (details.reason === "install") {
    initOptions();
    initHistory();
    chrome.tabs.create({ url: "public/onboarding.html" });
  }
});

// Listen for extension activation/deactivation
chrome.management.onEnabled.addListener((info) => {
  if (info.id === chrome.runtime.id) {
    extensionEnabled = true;
    processedTabs.clear(); // Clear our tracking to force reprocessing
    setupContextMenus();
  }
});

chrome.management.onDisabled.addListener((info) => {
  if (info.id === chrome.runtime.id) {
    extensionEnabled = false;
    processedTabs.clear(); // Clear processed tabs when disabled
  }
});

// Setup context menu items
function setupContextMenus() {
  // Remove existing context menu items to prevent duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "shortenUrl",
      title: chrome.i18n.getMessage("contextMenuShortenLinkTitle"),
      contexts: ["link"],
    });

    chrome.contextMenus.create({
      id: "shortenSelectedText",
      title: chrome.i18n.getMessage("contextMenuShortenSelectedTextTitle"),
      contexts: ["selection"],
    });

    chrome.contextMenus.create({
      id: "shortenPageLink",
      title: chrome.i18n.getMessage("contextMenuShortenPageLinkTitle"),
      contexts: ["all"],
    });
  });
}

// Helper function to check if a URL is injectable
function isInjectableUrl(url) {
  return url && 
    !url.startsWith('chrome://') && 
    !url.startsWith('chrome-extension://') && 
    !url.startsWith('edge://') &&
    !url.startsWith('about:');
}

// Listen for tab activation to inject content script if not already processed
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!extensionEnabled) return;
  
  try {
    if (!processedTabs.has(activeInfo.tabId)) {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (isInjectableUrl(tab.url)) {
        await injectContentScriptIntoTab(tab);
      }
    }
  } catch (error) {
    console.error("Error processing activated tab:", error);
  }
});

// Helper function to inject content script into a single tab
async function injectContentScriptIntoTab(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    processedTabs.add(tab.id);
    return true;
  } catch (err) {
    return false;
  }
}

// Clean up removed tabs from our processed set
chrome.tabs.onRemoved.addListener((tabId) => {
  processedTabs.delete(tabId);
});

chrome.contextMenus.onClicked.addListener(genericOnClick);

// A generic onclick callback function.
function genericOnClick(info) {
  switch (info.menuItemId) {
    case 'shortenUrl':
      handleLinkClick(info.linkUrl);
      break;
    case 'shortenSelectedText':
      handleTextClick(info.selectionText);
      break;
    case 'shortenPageLink':
      handlePageLinkClick(info.pageUrl);
      break;
    default:
      console.log('Standard context menu item clicked.');
  }
}

async function handleLinkClick(linkUrl) {
  if (linkUrl) {
    try {
      const shortenedUrl = await shortenUrlWithHistory(linkUrl);
      if (shortenedUrl) {
        const currentTab = await getCurrentTab();
        if (currentTab && currentTab.id) {
          await chrome.tabs.sendMessage(currentTab.id, { action: "copyToClipboard", text: shortenedUrl });
        } else {
          console.error("No active tab found");
        }
      } else {
        console.error("Failed to shorten URL");
      }
    } catch (error) {
      console.error("Error handling link click:", error);
    }
  }
}

async function handleTextClick(selectedText) {
  if (selectedText) {
    try {
      const shortenedUrl = await shortenUrlWithHistory(selectedText);
      if (shortenedUrl) {
        const currentTab = await getCurrentTab();
        if (currentTab && currentTab.id) {
          await chrome.tabs.sendMessage(currentTab.id, { action: "copyToClipboard", text: shortenedUrl });
        } else {
          console.error("No active tab found");
        }
      } else {
        console.error("Failed to shorten URL");
      }
    } catch (error) {
      console.error("Error handling text click:", error);
    }
  }
}

async function handlePageLinkClick(pageUrl) {
  if (pageUrl) {
    try {
      const shortenedUrl = await shortenUrlWithHistory(pageUrl);
      if (shortenedUrl) {
        const currentTab = await getCurrentTab();
        if (currentTab && currentTab.id) {
          await chrome.tabs.sendMessage(currentTab.id, { action: "copyToClipboard", text: shortenedUrl });
        } else {
          console.error("No active tab found");
        }
      }
    } catch (error) {
      console.error("Error handling page link click:", error);
    }
  }
}

function isValidUrl(selectedText) {
  try {
    const url = new URL(selectedText);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

async function shortenUrl(url) {
  if (!isValidUrl(url)) {
    console.error("Invalid URL:", url);
    return null;
  }
  try {
    const response = await fetch(API_URL, {
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

// Store shortened URL in history
async function addToHistory(originalUrl, shortenedUrl) {
  const entry = {
    id: shortenedUrl,
    originalUrl,
    shortenedUrl,
    createdAt: new Date().toISOString()
  };

  try {
    // Get existing entries
    const result = await chrome.storage.local.get('urlHistory');
    const urlHistory = result.urlHistory || [];
    
    // Add new entry to the beginning of the array
    urlHistory.unshift(entry);
    
    // Save updated history
    await chrome.storage.local.set({ urlHistory });
    return true;
  } catch (error) {
    console.error("Error saving to history:", error);
    return false;
  }
}

async function shortenUrlWithHistory(url) {
  const shortenedUrl = await shortenUrl(url);
  const storageOptions = await chrome.storage.sync.get('options');
  const options = storageOptions.options || { saveHistory: true };
  
  if (shortenedUrl && options.saveHistory) {
    // Add to history
    await addToHistory(url, shortenedUrl);
  }
  
  return shortenedUrl;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;
  if (action === "shortenUrl") {
    // get the URL from the request
    const { url } = request;
    shortenUrlWithHistory(url).then((shortenedUrl) => {
      if (shortenedUrl) {
        sendResponse({ shortenedUrl });
      } else {
        sendResponse({ error: chrome.i18n.getMessage("invalidUrlError") });
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
  const currentTab = await getCurrentTab();
  if (!currentTab || !currentTab.id) {
    console.error("No active tab found");
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: "getSelectedText" });

    if (response && response.selectedText) {
      const selectedText = response.selectedText;
      const shortenedUrl = await shortenUrlWithHistory(selectedText);

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

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}