chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // get the action from the request
  const { action } = request;
  // check if the action is to shorten the URL
  if (action === "shortenUrl") {
    // get the URL from the request
    const { url } = request;
    // Call the API to shorten the URL
    fetch("http://localhost:8080/api/shorten", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error("Error shortening URL:", response.statusText);
          sendResponse({ error: "Failed to shorten URL" });
        } else {
          return response.json();
        }
      })
      .then((data) => {
        if (data) {
          const shortenedUrl = data.short_url;
          // Send the shortened URL back to the popup
          sendResponse({ shortenedUrl });
        }
      })
      .catch((error) => {
        console.error("Error shortening URL:", error);
        sendResponse({ error: "Error shortening URL" });
      });
  }
  return true; // Keep the message channel open for sendResponse
});