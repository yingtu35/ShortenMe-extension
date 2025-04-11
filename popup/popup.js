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
  copyButton.style.backgroundColor = ""; // Reset to default
  copyButton.style.color = ""; // Reset to default
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
        copyButton.style.backgroundColor = "#4CAF50"; // Green background
        copyButton.style.color = "white"; // White text
        setTimeout(() => {
          resetButton();
        }, 3000); // Reset after 3 seconds
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

// Fetch the current tab's URL and shorten it when the popup is loaded
window.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTabUrl = tabs[0]?.url;
    if (currentTabUrl) {
      // Call the background script to shorten the URL
      chrome.runtime.sendMessage({ action: "shortenUrl", url: currentTabUrl }, (response) => {
        handleShortenedUrlResponse(response, currentTabUrl);
      });
    }
  });
});