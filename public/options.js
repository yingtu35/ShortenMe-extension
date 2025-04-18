// Store references to DOM elements
const saveHistoryCheckbox = document.getElementById('save-history');
const autoCreateCheckbox = document.getElementById('auto-create');
const themeModeSelect = document.getElementById('theme-mode');
const shortcutsLink = document.getElementById('shortcuts-link');
const saveButton = document.getElementById('save-btn');

// Default options
const defaultOptions = {
  saveHistory: true,
  autoCreate: true,
  themeMode: 'system' // 'light', 'dark', or 'system'
};

// Function to save options to chrome.storage.sync
function saveOptions(options) {
  chrome.storage.sync.set({ options }, () => {});
}

// Function to load options from chrome.storage.sync
function loadOptions() {
  chrome.storage.sync.get('options', (result) => {
    const options = result.options || defaultOptions;
    
    // Update UI to reflect current options
    saveHistoryCheckbox.checked = options.saveHistory;
    autoCreateCheckbox.checked = options.autoCreate;
    themeModeSelect.value = options.themeMode;
    
    // Apply theme based on saved preference
    applyTheme(options.themeMode);
  });
}

// Function to detect system theme preference
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

// Function to handle changes to options
function handleOptionChange(event) {
  event.preventDefault();
  
  const options = {
    saveHistory: saveHistoryCheckbox.checked,
    autoCreate: autoCreateCheckbox.checked,
    themeMode: themeModeSelect.value
  };
  
  saveOptions(options);
  applyTheme(options.themeMode);

  // change save button text to "Saved"
  saveButton.textContent = 'Changes saved';
  saveButton.disabled = true;

  setTimeout(() => {
    saveButton.textContent = 'Save Changes';
    saveButton.disabled = false;
  }, 3000);
}

saveButton.addEventListener('click', handleOptionChange);

// Event listener for keyboard shortcuts link
shortcutsLink.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (themeModeSelect.value === 'system') {
    applyTheme('system');
  }
});

// Initialize options on page load
document.addEventListener('DOMContentLoaded', loadOptions);