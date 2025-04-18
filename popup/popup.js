// Capture the url user input when the form is submitted

const copyButton = document.querySelector("#copy-button");
const errorText = document.querySelector("#error-text");

document.querySelector("#url-shorten-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const urlInput = document.querySelector("#url").value;
  // Reset the error message
  resetErrorText();
  
  // Call the background script to shorten the URL
  chrome.runtime.sendMessage({ action: "shortenUrl", url: urlInput }, function (response) {
    handleShortenedUrlResponse(response, urlInput);
  });
});

function resetButton() {
  copyButton.textContent = "Shorten URL and copy to clipboard";
  copyButton.disabled = false;
}

function resetErrorText() {
  errorText.textContent = "";
  errorText.style.display = "none";
}

// Function to handle the response from the background script
function handleShortenedUrlResponse(response, urlInput) {
  document.querySelector("#url").value = urlInput;
  if (response && response.shortenedUrl) {
    // Populate the current tab URL and shortened URL in the input fields
    document.querySelector("#shortened-url").value = response.shortenedUrl;

    try {
      navigator.clipboard.writeText(response.shortenedUrl).then(() => {
        // Change the copy button text
        copyButton.textContent = "Shortened URL copied!";
        copyButton.disabled = true;
        setTimeout(() => {
          resetButton();
        }, 2000); // Reset after 2 seconds
      });
    } catch (err) {
      // Display the error message
      errorText.textContent = "Failed to copy the shortened URL to clipboard.";
      errorText.style.display = "block";
    }
  } else if (response && response.error) {
    // Display the error message
    errorText.textContent = response.error;
    errorText.style.display = "block";
  } else {
    // Handle unexpected response
    errorText.textContent = "Unexpected error occurred.";
    errorText.style.display = "block";
  }
}

// Function to get the system theme preference
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Function to apply theme based on selected mode
function applyTheme(mode) {
  let theme = mode;
  
  // If system mode is selected, determine the actual theme based on system preference
  if (mode === 'system') {
    theme = getSystemTheme();
  }
  
  // Apply the theme to the document
  document.documentElement.setAttribute('data-theme', theme);
}

// Function to load theme from storage
async function loadTheme() {
  try {
    const result = await chrome.storage.sync.get('options');
    const options = result.options || { themeMode: 'system' };
    applyTheme(options.themeMode);
  } catch (error) {
    console.error("Error loading theme:", error);
    // Default to system theme if there's an error
    applyTheme('system');
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
  // Re-apply theme to handle system theme changes
  await loadTheme();
});

// Listen for theme changes from other parts of the extension
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.options) {
    const newOptions = changes.options.newValue || { themeMode: 'system' };
    applyTheme(newOptions.themeMode);
  }
});

function shortenCurrentTabUrl() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTabUrl = tabs[0]?.url;
    if (currentTabUrl) {
      // Call the background script to shorten the URL
      chrome.runtime.sendMessage({ action: "shortenUrl", url: currentTabUrl }, (response) => {
        handleShortenedUrlResponse(response, currentTabUrl);
      });
    }
  });
}

// Fetch the current tab's URL and shorten it when the popup is loaded
window.addEventListener("DOMContentLoaded", async () => {
  // Load and apply the theme
  await loadTheme();

  const storageOptions = await chrome.storage.sync.get('options');
  const options = storageOptions.options || { autoCreate: true };
  if (options.autoCreate) {
    shortenCurrentTabUrl();
  }
});