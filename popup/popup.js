// Capture the url user input when the form is submitted

const copyButton = document.querySelector("#copy-button");
const errorText = document.querySelector("#error-text");

document.querySelector("#url-shorten-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const urlInput = document.querySelector("#url").value;
  // Reset the error message
  resetErrorText();
  
  // Call the background script to shorten the URL
  chrome.runtime.sendMessage({ action: "shortenUrl", url: urlInput }, async function (response) {
    if (response && response.shortenedUrl) {
      // populate the shortened URL in the input field
      document.querySelector("#shortened-url").value = response.shortenedUrl;
      // Automatically copy the shortened URL to clipboard
      try {
        await navigator.clipboard.writeText(response.shortenedUrl);
        // Change the copy button text
        copyButton.textContent = "Shortened URL copied!";
        copyButton.style.backgroundColor = "#4CAF50"; // Green background
        copyButton.style.color = "white"; // White text
        setTimeout(() => {
          resetButton();
        }, 3000); // Reset after 3 seconds
      } catch (err) {
        // Displat the error message
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
  );
}
);

function resetButton() {
  copyButton.textContent = "Shorten URL and copy to clipboard";
  copyButton.style.backgroundColor = ""; // Reset to default
  copyButton.style.color = ""; // Reset to default
}

function resetErrorText() {
  errorText.textContent = "";
  errorText.style.display = "none";
}