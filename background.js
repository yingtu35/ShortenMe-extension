const API_URL = "https://shortenme.link/api/shorten";

chrome.runtime.onInstalled.addListener(() => {
  // Add a context menu item for shortening URLs when right-clicking a link
  chrome.contextMenus.create({
    id: "shortenUrl",
    title: "Shorten the link and copy to clipboard",
    contexts: ["link"],
  })

  // Add a context menu item for shortening URLs when right-clicking selected text
  chrome.contextMenus.create({
    id: "shortenSelectedText",
    title: "Shorten selected text and copy to clipboard",
    contexts: ["selection"],
  });

  // Add a context menu item for shortening page link
  chrome.contextMenus.create({
    id: "shortenPageLink",
    title: "Shorten page link and copy to clipboard",
    contexts: ["all"],
  });
});  

chrome.contextMenus.onClicked.addListener(genericOnClick);

// A generic onclick callback function.
function genericOnClick(info) {
  switch (info.menuItemId) {
    case 'shortenUrl':
      handleLinkClick(info.linkUrl);
      break;
    case 'shortenSelectedText':
      // Checkbox item function
      handleTextClick(info.selectionText);
      break;
    case 'shortenPageLink':
      // Checkbox item function
      handlePageLinkClick(info.pageUrl);
      break;
    default:
      console.log('Standard context menu item clicked.');
  }
}

async function handleLinkClick(linkUrl) {
  if (linkUrl) {
    try {
      const shortenedUrl = await shortenUrl(linkUrl);
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
      const shortenedUrl = await shortenUrl(selectedText);
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
      const shortenedUrl = await shortenUrl(pageUrl);
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
  // Check if the URL is valid
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
  const currentTab = await getCurrentTab();
  if (!currentTab || !currentTab.id) {
    console.error("No active tab found");
    return;
  }

  try {
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

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}