// Get all shortened URLs entries from the history
async function getHistory() {
  try {
    const result = await chrome.storage.local.get('urlHistory');
    return result.urlHistory || [];
  } catch (error) {
    console.error("Error retrieving history:", error);
    return [];
  }
}

// Delete a single entry from the history
async function deleteEntry(id) {
  try {
    const result = await chrome.storage.local.get('urlHistory');
    let urlHistory = result.urlHistory || [];
    
    // Filter out the entry with the given ID
    urlHistory = urlHistory.filter(entry => entry.id !== id);
    
    // Save the updated history
    await chrome.storage.local.set({ urlHistory });

    return true;
  } catch (error) {
    console.error("Error deleting entry:", error);
    return false;
  }
}

// Delete all entries from the history
async function clearHistory() {
  try {
    await chrome.storage.local.set({ urlHistory: [] });

    return true;
  } catch (error) {
    console.error("Error clearing history:", error);
    return false;
  }
}

// Display history in the UI
function displayHistory(history) {
  const tableBody = document.querySelector('table tbody');
  
  // Clear existing rows
  tableBody.innerHTML = '';
  
  if (history.length === 0) {
    // Display a message if there are no entries
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'No shortened URLs in history';
    cell.style.textAlign = 'center';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }
  
  // Add entries to the table
  history.forEach(entry => {
    const row = document.createElement('tr');
    
    // Original URL column
    const originalUrlCell = document.createElement('td');
    originalUrlCell.textContent = entry.originalUrl;
    row.appendChild(originalUrlCell);
    
    // Shortened URL column with clickable link
    const shortenedUrlCell = document.createElement('td');
    const shortenedUrlLink = document.createElement('a');
    shortenedUrlLink.href = entry.shortenedUrl;
    shortenedUrlLink.target = '_blank';
    shortenedUrlLink.textContent = entry.shortenedUrl;
    shortenedUrlCell.appendChild(shortenedUrlLink);
    row.appendChild(shortenedUrlCell);
    
    // Delete button column
    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = '❌';
    deleteButton.dataset.id = entry.id;
    deleteCell.appendChild(deleteButton);
    row.appendChild(deleteCell);
    
    tableBody.appendChild(row);
  });
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

// Initialize the page
async function init() {
  // Load and apply the theme
  await loadTheme();
  
  const history = await getHistory();
  displayHistory(history);
  
  document.querySelector('table').addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
      const id = event.target.dataset.id;
      if (id) {
        await deleteEntry(id);
      }
    }
  });
  
  const clearAllButton = document.getElementById('clear-all-btn');
  if (clearAllButton) {
    clearAllButton.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all history?')) {
        await clearHistory();
        clearAllButton.style.pointerEvents = 'none';
        clearAllButton.disabled = true;
        clearAllButton.textContent = 'History cleared!';
        clearAllButton.style.backgroundColor = '#28a785';
        setTimeout(() => {
          clearAllButton.style.pointerEvents = 'auto';
          clearAllButton.disabled = false;
          clearAllButton.textContent = 'Clear All History';
          clearAllButton.style.backgroundColor = ''; // Reset to default
        }
        , 3000);
      }
    });
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
  
  if (namespace === 'local' && changes.urlHistory) {
    displayHistory(changes.urlHistory.newValue || []);
  }
});

document.addEventListener('DOMContentLoaded', init);