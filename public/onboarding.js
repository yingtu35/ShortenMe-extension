// Load and apply theme based on saved option
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  let theme = mode;
  if (mode === 'system') {
    theme = getSystemTheme();
  }
  document.documentElement.setAttribute('data-theme', theme);
}

function loadTheme() {
  chrome.storage.sync.get('options', (result) => {
    const opts = result.options || {};
    const mode = opts.themeMode || 'system';
    applyTheme(mode);
  });
}

// Listen for system theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  chrome.storage.sync.get('options', (result) => {
    const mode = (result.options && result.options.themeMode) || 'system';
    if (mode === 'system') applyTheme('system');
  });
});

// Listen for theme changes from other parts of the extension
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.options) {
    const newOptions = changes.options.newValue || { themeMode: 'system' };
    applyTheme(newOptions.themeMode);
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Replace i18n placeholders in onboarding page
  const appName = chrome.i18n.getMessage('appName');
  // Set document title
  const titleEl = document.querySelector('title[data-i18n="pageTitle"]');
  if (titleEl) {
    titleEl.textContent = chrome.i18n.getMessage('pageTitle', [appName]);
  }
  // Replace all data-i18n elements
  document.body.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key, [appName]);
    if (message) {
      el.innerHTML = message;
    }
  });

  loadTheme();

  // Hide scroll indicator when user reaches action button
  const indicator = document.querySelector('.scroll-indicator');
  const target = document.querySelector('.epilogue');
  if (indicator && target) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          indicator.classList.add('hidden');
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(target);
  }

  // Chevron click: scroll to next block
  if (indicator) {
    const blocks = Array.from(document.querySelectorAll('.scroll-element')).map(el => el);
    indicator.addEventListener('click', () => {
      const scrollPos = window.scrollY;
      const viewportHeight = window.innerHeight;
      // find next block whose top is greater than current scroll
      const nextBlock = blocks.find(el => el.offsetTop > scrollPos + 10);
      if (nextBlock) {
        window.scrollTo({ top: nextBlock.offsetTop, behavior: 'smooth' });
      } else {
        // no more blocks, hide indicator
        indicator.classList.add('hidden');
      }
    });
  }
});