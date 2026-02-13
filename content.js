/**
 * X / Twitter AI Post Blocker
 * Hides feed posts (tweets) that contain AI-related content
 */

// Keywords and phrases that indicate a post is about AI
const AI_PATTERNS = [
  /\bAI\b/i,
  /\bartificial intelligence\b/i,
  /\bmachine learning\b/i,
  /\bML\b(?!\s*\/\s*ops)/i,  // ML but not MLOps in isolation
  /\bCursor\b/i,
  /\bChatGPT\b/i,
  /\bGPT-?[34]\b/i,
  /\bGPT\b/i,
  /\bLLM\b/i,
  /\blarge language model/i,
  /\bgenerative AI\b/i,
  /\bGenAI\b/i,
  /\bOpenAI\b/i,
  /\bClaude\b/i,
  /\bAnthropic\b/i,
  /\bGemini\b/i,
  /\bCopilot\b/i,
  /\bprompt engineering\b/i,
  /\bAGI\b/i,
  /\bartificial general intelligence\b/i,
  /\bneural network\b/i,
  /\bdeep learning\b/i,
  /\bLangChain\b/i,
  /\bRAG\b/i,
  /\bretrieval.?augmented\b/i,
  /\bfine.?tuning\b/i,
  /\bvector database\b/i,
  /\bembeddings?\b/i,
  /\bAI.?generated\b/i,
  /\bAI.?powered\b/i,
  /\bAI.?driven\b/i,
  /\bbuilt with AI\b/i,
  /\bpowered by AI\b/i,
  /\bAI.?tool\b/i,
  /\bAI.?tools\b/i,
  /\bAI.?agent\b/i,
  /\bAI.?agents\b/i,
];

// Selectors for X/Twitter tweets (uses data-testid for stability)
const TWEET_SELECTOR = 'article[data-testid="tweet"]';

// Track posts we've already processed to avoid re-checking
const processedPosts = new WeakSet();

function getPostText(element) {
  const textContent = element.textContent || '';
  // Also check for alt text on images (AI-generated image posts)
  const images = element.querySelectorAll('img[alt]');
  const altText = Array.from(images).map(img => img.alt || '').join(' ');
  return `${textContent} ${altText}`;
}

function isAboutAI(text) {
  if (!text || text.length < 10) return false;
  return AI_PATTERNS.some(pattern => pattern.test(text));
}

function getTweetContainer(element) {
  // On X/Twitter, tweets are article[data-testid="tweet"]
  let current = element;
  while (current && current !== document.body) {
    if (current.getAttribute?.('data-testid') === 'tweet') {
      return current;
    }
    current = current.parentElement;
  }
  return element;
}

let isEnabled = true;

function hidePost(postElement) {
  if (!isEnabled) return;
  const container = getTweetContainer(postElement);
  if (processedPosts.has(container)) return;
  
  processedPosts.add(container);
  container.style.display = 'none';
  container.setAttribute('data-ai-blocker-hidden', 'true');
}

function checkAndHidePost(element) {
  if (element.getAttribute('data-ai-blocker-hidden') === 'true') return;
  if (processedPosts.has(element)) return;

  const text = getPostText(element);
  if (isAboutAI(text)) {
    hidePost(element);
  }
}

function scanForPosts(root = document) {
  const candidates = root.querySelectorAll(TWEET_SELECTOR);

  candidates.forEach(el => {
    if (el.offsetParent === null) return; // Skip already hidden
    if (el.getAttribute('data-ai-blocker-hidden') === 'true') return;
    
    const text = getPostText(el);
    if (text.length > 20 && isAboutAI(text)) {
      hidePost(el);
    }
  });
}

function init() {
  // Initial scan
  scanForPosts();

  // Watch for dynamically loaded content (infinite scroll)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanForPosts(node);
            // Also check the node itself if it might be a post
            if (node.querySelector) {
              checkAndHidePost(node);
            }
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Rescan periodically for any tweets that might have been missed
  setInterval(() => scanForPosts(), 2000);
}

function start() {
  chrome.storage.sync.get(['enabled'], (result) => {
    isEnabled = result.enabled !== false;
    init();
  });
}

// Listen for toggle changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (!isEnabled) {
      document.querySelectorAll('[data-ai-blocker-hidden="true"]').forEach(el => {
        processedPosts.delete(el);
        el.style.display = '';
        el.removeAttribute('data-ai-blocker-hidden');
      });
    } else {
      scanForPosts();
    }
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
