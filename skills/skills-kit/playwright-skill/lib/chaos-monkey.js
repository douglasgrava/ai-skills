/**
 * Chaos Monkey Module for Playwright Skill
 *
 * Provides diverse chaotic interaction primitives that an AI agent orchestrates
 * based on page context. Unlike gremlins.js (purely random), these scenarios are
 * designed to be selected intelligently by an AI that understands the current
 * page state, visible elements, and application flow.
 *
 * Categories:
 *   - Click Chaos: unexpected click patterns
 *   - Navigation Chaos: disruptive navigation during flows
 *   - Form Chaos: malicious/unexpected form inputs
 *   - Timing Chaos: race conditions and async disruption
 *   - Viewport Chaos: layout stress via resizing/zoom
 *   - Keyboard Chaos: unexpected keyboard interactions
 *   - State Chaos: corrupt or destroy application state
 *   - Gesture Chaos: unusual pointer/touch gestures
 *   - Multi-tab Chaos: concurrent session conflicts
 *   - Accessibility Chaos: screen-reader / focus-trap edge cases
 */

// ============================================================================
// CLICK CHAOS
// ============================================================================

/**
 * Rapid-fire clicks on the same element (simulates impatient user)
 */
async function rapidClick(page, selector, { count = 5, interval = 50 } = {}) {
  const el = await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);
  if (!el) return { action: 'rapidClick', selector, result: 'element_not_found' };

  for (let i = 0; i < count; i++) {
    await el.click({ force: true }).catch(() => {});
    if (interval > 0) await page.waitForTimeout(interval);
  }
  return { action: 'rapidClick', selector, clicks: count, interval };
}

/**
 * Double-click on elements that don't expect it (buttons, links, icons)
 */
async function unexpectedDblClick(page, selector) {
  const el = await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);
  if (!el) return { action: 'unexpectedDblClick', selector, result: 'element_not_found' };

  await el.dblclick({ force: true }).catch(() => {});
  return { action: 'unexpectedDblClick', selector };
}

/**
 * Click on a random coordinate (may hit nothing, overlays, or hidden elements)
 */
async function clickRandomCoordinate(page) {
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  const x = Math.floor(Math.random() * viewport.width);
  const y = Math.floor(Math.random() * viewport.height);
  await page.mouse.click(x, y).catch(() => {});
  return { action: 'clickRandomCoordinate', x, y };
}

/**
 * Click on disabled elements with force
 */
async function clickDisabledElements(page) {
  const disabled = await page.$$('[disabled], [aria-disabled="true"], .disabled');
  const results = [];
  for (const el of disabled.slice(0, 5)) {
    await el.click({ force: true }).catch(() => {});
    const tag = await el.evaluate(e => `${e.tagName}.${e.className}`).catch(() => 'unknown');
    results.push(tag);
  }
  return { action: 'clickDisabledElements', clicked: results };
}

/**
 * Right-click (context menu) on interactive elements
 */
async function rightClickEverywhere(page) {
  const elements = await page.$$('button, a, input, [role="button"], [onclick]');
  const picked = elements.sort(() => Math.random() - 0.5).slice(0, 3);
  const results = [];
  for (const el of picked) {
    await el.click({ button: 'right', force: true }).catch(() => {});
    const tag = await el.evaluate(e => e.tagName).catch(() => '?');
    results.push(tag);
  }
  return { action: 'rightClickEverywhere', elements: results };
}

/**
 * Click during CSS transitions/animations
 */
async function clickDuringTransition(page, triggerSelector, targetSelector) {
  const trigger = await page.$(triggerSelector);
  if (trigger) await trigger.click().catch(() => {});
  // Immediately try clicking the target before animation completes
  await page.waitForTimeout(50);
  const target = await page.$(targetSelector);
  if (target) await target.click({ force: true }).catch(() => {});
  return { action: 'clickDuringTransition', triggerSelector, targetSelector };
}

/**
 * Click somewhere then instantly click somewhere else (cancel first action)
 */
async function clickAndImmediatelyClickElsewhere(page, selector1, selector2) {
  const [el1, el2] = await Promise.all([
    page.$(selector1),
    page.$(selector2)
  ]);
  if (el1) el1.click({ force: true }).catch(() => {});
  // No await - fire and forget, immediately click second
  if (el2) await el2.click({ force: true }).catch(() => {});
  return { action: 'clickAndImmediatelyClickElsewhere', selector1, selector2 };
}


// ============================================================================
// NAVIGATION CHAOS
// ============================================================================

/**
 * Hit browser back during a multi-step flow
 */
async function backDuringFlow(page) {
  const urlBefore = page.url();
  await page.goBack().catch(() => {});
  const urlAfter = page.url();
  return { action: 'backDuringFlow', urlBefore, urlAfter };
}

/**
 * Refresh the page at an unexpected moment
 */
async function refreshMidAction(page) {
  const urlBefore = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  return { action: 'refreshMidAction', url: urlBefore };
}

/**
 * Navigate to a completely different page then come back
 */
async function navigateAwayAndBack(page, foreignUrl = 'about:blank') {
  const currentUrl = page.url();
  await page.goto(foreignUrl, { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  return { action: 'navigateAwayAndBack', original: currentUrl };
}

/**
 * Rapidly toggle between two routes
 */
async function rapidRouteToggle(page, url1, url2, { cycles = 5, delay = 200 } = {}) {
  const results = [];
  for (let i = 0; i < cycles; i++) {
    const target = i % 2 === 0 ? url1 : url2;
    await page.goto(target, { waitUntil: 'commit', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(delay);
    results.push(target);
  }
  return { action: 'rapidRouteToggle', cycles, urls: [url1, url2] };
}

/**
 * Navigate via direct URL to a page that requires prior state (e.g., step 3 of a wizard)
 */
async function deepLinkWithoutState(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  return { action: 'deepLinkWithoutState', url };
}

/**
 * Use location.hash or pushState to corrupt the URL without navigation
 */
async function corruptUrl(page) {
  const original = page.url();
  await page.evaluate(() => {
    window.history.pushState({}, '', window.location.pathname + '?__chaos=1&broken=true#/invalid/route');
  }).catch(() => {});
  let corrupted = '?';
  try { corrupted = page.url(); } catch (e) {}
  return { action: 'corruptUrl', original, corrupted };
}


// ============================================================================
// FORM CHAOS
// ============================================================================

/**
 * Submit a form completely empty
 */
async function submitEmptyForm(page, formSelector = 'form') {
  const form = await page.$(formSelector);
  if (!form) return { action: 'submitEmptyForm', result: 'no_form_found' };

  // Clear all inputs first
  const inputs = await form.$$('input, textarea, select');
  for (const input of inputs) {
    const type = await input.getAttribute('type').catch(() => 'text');
    if (type !== 'hidden' && type !== 'submit') {
      await input.fill('').catch(() => {});
    }
  }
  // Try submitting
  const submit = await form.$('button[type="submit"], input[type="submit"], button:not([type])');
  if (submit) await submit.click({ force: true }).catch(() => {});
  return { action: 'submitEmptyForm', formSelector };
}

/**
 * Paste extremely long text into inputs
 */
async function pasteGiantText(page, selector, length = 100000) {
  const el = await page.$(selector);
  if (!el) return { action: 'pasteGiantText', result: 'not_found' };

  const giantText = 'A'.repeat(length);
  await el.fill(giantText).catch(() => {});
  return { action: 'pasteGiantText', selector, length };
}

/**
 * Enter potentially dangerous strings (XSS, SQL injection, format strings)
 */
async function enterMaliciousInput(page, selector) {
  const payloads = [
    '<script>alert("xss")</script>',
    '"><img src=x onerror=alert(1)>',
    "'; DROP TABLE users; --",
    "' OR '1'='1' --",
    '{{constructor.constructor("return this")()}}',
    '${7*7}',
    '%s%s%s%s%s%s%s%s%s%s',
    '../../../etc/passwd',
    'javascript:alert(1)',
    '\x00\x01\x02\x03\x04\x05',
    'AAAA%08x.%08x.%08x.%08x',
    '<svg/onload=alert(1)>',
    '{"__proto__":{"admin":true}}',
  ];

  const el = await page.$(selector);
  if (!el) return { action: 'enterMaliciousInput', result: 'not_found' };

  const payload = payloads[Math.floor(Math.random() * payloads.length)];
  await el.fill(payload).catch(() => {});
  return { action: 'enterMaliciousInput', selector, payload };
}

/**
 * Fill inputs with unicode edge cases (RTL, zero-width, emoji, combining chars)
 */
async function enterUnicodeEdgeCases(page, selector) {
  const unicodePayloads = [
    '\u200B\u200B\u200B',                             // zero-width spaces
    '\u202E\u0645\u0631\u062D\u0628\u0627',           // RTL override
    '\uD83D\uDE00\uD83D\uDCA9\uD83C\uDDF7\uD83C\uDDFA', // emoji
    'a\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307', // combining diacriticals
    '\uFEFF\uFEFF\uFEFF',                             // byte order marks
    '田中太郎',                                         // CJK
    'test\nnewline\ttab\rcarriage',                    // control chars in text
    '🏳️‍🌈👨‍👩‍👧‍👦',                                       // complex emoji sequences
    '\u0000NULL\u0000',                                // null bytes
    '｛ｆｕｌｌｗｉｄｔｈ｝',                              // fullwidth chars
    'Ṫ̈̃ö ịṇ̃v̈ö̃k̈ë̃ ẗ̈̃ḧ̈̃ë̃ ḧ̈̃ï̃v̈ë̃-m̈ï̃ṇ̃d̈',  // zalgo text
  ];

  const el = await page.$(selector);
  if (!el) return { action: 'enterUnicodeEdgeCases', result: 'not_found' };

  const payload = unicodePayloads[Math.floor(Math.random() * unicodePayloads.length)];
  await el.fill(payload).catch(() => {});
  return { action: 'enterUnicodeEdgeCases', selector, payload };
}

/**
 * Fill number fields with boundary/extreme values
 */
async function enterBoundaryNumbers(page, selector) {
  const boundaries = [
    '0', '-1', '-0', '999999999999999',
    '9007199254740991',   // Number.MAX_SAFE_INTEGER
    '-9007199254740991',  // Number.MIN_SAFE_INTEGER
    '1.7976931348623157e+308', // Number.MAX_VALUE
    '5e-324',             // Number.MIN_VALUE
    'NaN', 'Infinity', '-Infinity',
    '0.1 + 0.2',         // floating point string
    '1e999',              // overflow
    '0x1A',               // hex
    '0b1010',             // binary
    '0o17',               // octal
  ];

  const el = await page.$(selector);
  if (!el) return { action: 'enterBoundaryNumbers', result: 'not_found' };

  const value = boundaries[Math.floor(Math.random() * boundaries.length)];
  await el.fill(value).catch(() => {});
  return { action: 'enterBoundaryNumbers', selector, value };
}

/**
 * Rapidly change a select/dropdown option back and forth
 */
async function flickerSelect(page, selector, { cycles = 10, delay = 50 } = {}) {
  const el = await page.$(selector);
  if (!el) return { action: 'flickerSelect', result: 'not_found' };

  const options = await el.$$eval('option', opts => opts.map(o => o.value));
  if (options.length < 2) return { action: 'flickerSelect', result: 'too_few_options' };

  for (let i = 0; i < cycles; i++) {
    const value = options[i % options.length];
    await el.selectOption(value).catch(() => {});
    await page.waitForTimeout(delay);
  }
  return { action: 'flickerSelect', selector, cycles };
}

/**
 * Fill a form, then clear everything, then submit
 */
async function fillClearSubmit(page, formSelector = 'form') {
  const form = await page.$(formSelector);
  if (!form) return { action: 'fillClearSubmit', result: 'no_form' };

  const inputs = await form.$$('input:not([type="hidden"]):not([type="submit"]), textarea');

  // Fill with random data
  for (const input of inputs) {
    await input.fill('chaos_test_' + Math.random().toString(36).slice(2, 8)).catch(() => {});
  }
  await page.waitForTimeout(300);

  // Clear everything
  for (const input of inputs) {
    await input.fill('').catch(() => {});
  }

  // Submit
  const submit = await form.$('button[type="submit"], input[type="submit"], button:not([type])');
  if (submit) await submit.click({ force: true }).catch(() => {});
  return { action: 'fillClearSubmit', formSelector, inputCount: inputs.length };
}


// ============================================================================
// TIMING CHAOS
// ============================================================================

/**
 * Click a button, then immediately click it again before response arrives
 */
async function doubleSubmit(page, selector) {
  const el = await page.$(selector);
  if (!el) return { action: 'doubleSubmit', result: 'not_found' };

  // Fire two clicks with no await between them
  const click1 = el.click({ force: true }).catch(() => {});
  const click2 = el.click({ force: true }).catch(() => {});
  await Promise.all([click1, click2]);
  return { action: 'doubleSubmit', selector };
}

/**
 * Throttle network to simulate slow connection, then interact
 */
async function interactWithSlowNetwork(page, context, callback) {
  // Note: Playwright doesn't have direct network throttling.
  // We simulate by adding artificial delay via route interception.
  let routeHandler;
  try {
    routeHandler = async (route) => {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
      await route.continue().catch(() => route.abort().catch(() => {}));
    };
    await context.route('**/*', routeHandler);

    if (callback) await callback(page);
    await page.waitForTimeout(3000);
  } finally {
    if (routeHandler) await context.unroute('**/*', routeHandler).catch(() => {});
  }
  return { action: 'interactWithSlowNetwork' };
}

/**
 * Go offline, interact with the page, then come back online
 */
async function offlineInteraction(page, context, callback) {
  try {
    await context.setOffline(true);
    if (callback) await callback(page);
    await page.waitForTimeout(2000);
  } finally {
    await context.setOffline(false);
  }
  return { action: 'offlineInteraction' };
}

/**
 * Click elements while page is still loading (before load event)
 */
async function interactDuringLoad(page, url, selectors = []) {
  // Navigate but don't wait for full load
  page.goto(url, { waitUntil: 'commit' }).catch(() => {});
  await page.waitForTimeout(100);

  const results = [];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click({ force: true }).catch(() => {});
      results.push(sel);
    }
  }
  // Now wait for page to settle
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  return { action: 'interactDuringLoad', url, clickedDuringLoad: results };
}

/**
 * Close a modal/dialog while an async operation is still running
 */
async function closeModalDuringAsync(page, triggerSelector, closeSelector) {
  const trigger = await page.$(triggerSelector);
  if (trigger) await trigger.click().catch(() => {});
  // Don't wait for the async op to finish - immediately close
  await page.waitForTimeout(200);
  const close = await page.$(closeSelector);
  if (close) await close.click({ force: true }).catch(() => {});
  return { action: 'closeModalDuringAsync', triggerSelector, closeSelector };
}


// ============================================================================
// VIEWPORT / LAYOUT CHAOS
// ============================================================================

/**
 * Rapidly resize the viewport through many sizes
 */
async function rapidResize(page, { cycles = 8, delay = 200 } = {}) {
  const sizes = [
    { width: 320, height: 480 },   // tiny mobile
    { width: 375, height: 667 },   // iPhone SE
    { width: 768, height: 1024 },  // iPad
    { width: 1024, height: 768 },  // iPad landscape
    { width: 1920, height: 1080 }, // desktop
    { width: 2560, height: 1440 }, // 2K
    { width: 400, height: 200 },   // extremely short
    { width: 200, height: 900 },   // extremely narrow
    { width: 1, height: 1 },       // absurdly small
    { width: 5120, height: 2880 }, // 5K
  ];

  const resized = [];
  for (let i = 0; i < cycles; i++) {
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    await page.setViewportSize(size).catch(() => {});
    resized.push(`${size.width}x${size.height}`);
    await page.waitForTimeout(delay);
  }
  return { action: 'rapidResize', resized };
}

/**
 * Scroll frantically in all directions
 */
async function franticScroll(page, { actions = 15, delay = 100 } = {}) {
  const scrollActions = [];
  for (let i = 0; i < actions; i++) {
    const dx = Math.floor(Math.random() * 2000 - 1000);
    const dy = Math.floor(Math.random() * 4000 - 1000);
    await page.evaluate(({ dx, dy }) => window.scrollBy(dx, dy), { dx, dy }).catch(() => {});
    scrollActions.push({ dx, dy });
    await page.waitForTimeout(delay);
  }
  return { action: 'franticScroll', scrollActions: scrollActions.length };
}

/**
 * Scroll while content is loading (lazy load stress)
 */
async function scrollDuringLoad(page) {
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 500)).catch(() => {});
    await page.waitForTimeout(50);
  }
  // Rapid scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  return { action: 'scrollDuringLoad' };
}

/**
 * Zoom in/out via keyboard shortcuts
 */
async function zoomChaos(page, { cycles = 6 } = {}) {
  const actions = [];
  for (let i = 0; i < cycles; i++) {
    const zoomIn = Math.random() > 0.5;
    const key = zoomIn ? 'Control+=' : 'Control+-';
    await page.keyboard.press(key).catch(() => {});
    actions.push(zoomIn ? 'zoom_in' : 'zoom_out');
    await page.waitForTimeout(150);
  }
  // Reset zoom
  await page.keyboard.press('Control+0').catch(() => {});
  actions.push('reset');
  return { action: 'zoomChaos', actions };
}


// ============================================================================
// KEYBOARD CHAOS
// ============================================================================

/**
 * Spam random keys on the page
 */
async function keyboardSpam(page, { count = 30, delay = 30 } = {}) {
  const keys = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  const pressed = [];
  for (let i = 0; i < count; i++) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    await page.keyboard.press(key).catch(() => {});
    pressed.push(key);
    if (delay > 0) await page.waitForTimeout(delay);
  }
  return { action: 'keyboardSpam', pressed: pressed.join('') };
}

/**
 * Press Escape at various moments (should close modals, cancel operations)
 */
async function escapeSpam(page, { count = 5, delay = 300 } = {}) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(delay);
  }
  return { action: 'escapeSpam', count };
}

/**
 * Tab through the entire page rapidly (focus trap test)
 */
async function tabThroughPage(page, { count = 50, delay = 30 } = {}) {
  const focusedElements = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab').catch(() => {});
    if (i % 10 === 0) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName}#${el.id || ''}.${el.className || ''}` : 'none';
      }).catch(() => 'error');
      focusedElements.push(focused);
    }
    await page.waitForTimeout(delay);
  }
  return { action: 'tabThroughPage', tabCount: count, sampledFocus: focusedElements };
}

/**
 * Fire keyboard shortcuts that the app may or may not handle
 */
async function randomShortcuts(page) {
  const shortcuts = [
    'Control+a', 'Control+c', 'Control+v', 'Control+x',
    'Control+z', 'Control+Shift+z', 'Control+s', 'Control+p',
    'Control+f', 'Control+h', 'Control+d', 'Control+w',
    'F1', 'F2', 'F5', 'F11', 'F12',
    'Alt+F4', 'Alt+Tab',
    'Enter', 'Space', 'Delete', 'Backspace', 'Home', 'End',
    'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown',
  ];

  const fired = [];
  const sample = shortcuts.sort(() => Math.random() - 0.5).slice(0, 10);
  for (const shortcut of sample) {
    await page.keyboard.press(shortcut).catch(() => {});
    fired.push(shortcut);
    await page.waitForTimeout(100);
  }
  return { action: 'randomShortcuts', fired };
}

/**
 * Type while an autocomplete/dropdown is loading
 */
async function typeWhileAutocompleteLoads(page, selector, text = 'test query here') {
  const el = await page.$(selector);
  if (!el) return { action: 'typeWhileAutocompleteLoads', result: 'not_found' };

  // Type very fast character by character
  for (const char of text) {
    await el.type(char, { delay: 0 }).catch(() => {});
    // Occasionally press arrow keys or enter mid-typing
    if (Math.random() > 0.7) {
      const chaos = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'][Math.floor(Math.random() * 4)];
      await page.keyboard.press(chaos).catch(() => {});
    }
  }
  return { action: 'typeWhileAutocompleteLoads', selector, text };
}


// ============================================================================
// STATE CHAOS
// ============================================================================

/**
 * Clear all localStorage
 */
async function clearLocalStorage(page) {
  const keysBefore = await page.evaluate(() => Object.keys(localStorage)).catch(() => []);
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  return { action: 'clearLocalStorage', keysCleared: keysBefore };
}

/**
 * Clear all sessionStorage
 */
async function clearSessionStorage(page) {
  const keysBefore = await page.evaluate(() => Object.keys(sessionStorage)).catch(() => []);
  await page.evaluate(() => sessionStorage.clear()).catch(() => {});
  return { action: 'clearSessionStorage', keysCleared: keysBefore };
}

/**
 * Corrupt localStorage with garbage data
 */
async function corruptLocalStorage(page) {
  const corrupted = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const corrupted = [];
    for (const key of keys) {
      localStorage.setItem(key, '{CORRUPTED_' + Math.random() + '}');
      corrupted.push(key);
    }
    // Also add garbage keys
    localStorage.setItem('__chaos_null', '\x00\x00\x00');
    localStorage.setItem('__chaos_huge', 'X'.repeat(5000000));
    localStorage.setItem('__chaos_json', '{{{invalid json}}}');
    return corrupted;
  }).catch(() => []);
  return { action: 'corruptLocalStorage', corrupted };
}

/**
 * Delete all cookies
 */
async function clearCookies(context) {
  await context.clearCookies().catch(() => {});
  return { action: 'clearCookies' };
}

/**
 * Kill all WebSocket connections by overriding the constructor
 */
async function killWebSockets(page) {
  await page.evaluate(() => {
    // Close existing WebSockets
    if (window.__chaosOriginalWS) return; // already injected
    window.__chaosOriginalWS = window.WebSocket;
    const originalWS = window.WebSocket;

    // Find and close existing ones if tracked
    window.__chaosWSList = window.__chaosWSList || [];
    window.__chaosWSList.forEach(ws => {
      try { ws.close(); } catch (e) {}
    });

    // Monkey-patch to track new ones
    window.WebSocket = function(...args) {
      const ws = new originalWS(...args);
      window.__chaosWSList.push(ws);
      return ws;
    };
    window.WebSocket.prototype = originalWS.prototype;
  }).catch(() => {});
  return { action: 'killWebSockets' };
}

/**
 * Restore WebSocket constructor after killWebSockets
 */
async function restoreWebSockets(page) {
  await page.evaluate(() => {
    if (window.__chaosOriginalWS) {
      window.WebSocket = window.__chaosOriginalWS;
      delete window.__chaosOriginalWS;
      delete window.__chaosWSList;
    }
  }).catch(() => {});
  return { action: 'restoreWebSockets' };
}

/**
 * Simulate expired auth token by corrupting auth-related storage
 */
async function expireAuthToken(page) {
  const corrupted = await page.evaluate(() => {
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (/token|auth|session|jwt|bearer|user/i.test(key)) {
        localStorage.setItem(key, 'expired_' + Date.now());
        authKeys.push(key);
      }
    }
    // Also corrupt cookies that look auth-related
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0];
      if (/token|auth|session|jwt/i.test(name)) {
        document.cookie = `${name}=expired; max-age=0`;
        authKeys.push('cookie:' + name);
      }
    });
    return authKeys;
  }).catch(() => []);
  return { action: 'expireAuthToken', corrupted };
}


// ============================================================================
// GESTURE CHAOS
// ============================================================================

/**
 * Drag a random element to a random position
 */
async function randomDrag(page) {
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  const startX = Math.floor(Math.random() * viewport.width);
  const startY = Math.floor(Math.random() * viewport.height);
  const endX = Math.floor(Math.random() * viewport.width);
  const endY = Math.floor(Math.random() * viewport.height);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Move in steps to simulate real drag
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  return { action: 'randomDrag', from: { x: startX, y: startY }, to: { x: endX, y: endY } };
}

/**
 * Hover erratically across the page
 */
async function erraticHover(page, { moves = 20, delay = 50 } = {}) {
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  for (let i = 0; i < moves; i++) {
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    await page.mouse.move(x, y).catch(() => {});
    await page.waitForTimeout(delay);
  }
  return { action: 'erraticHover', moves };
}

/**
 * Mouse wheel scroll in random directions
 */
async function randomMouseWheel(page, { events = 10 } = {}) {
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  for (let i = 0; i < events; i++) {
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    const deltaY = Math.floor(Math.random() * 2000 - 1000);
    await page.mouse.wheel(0, deltaY).catch(() => {});
    await page.waitForTimeout(50);
  }
  return { action: 'randomMouseWheel', events };
}

/**
 * Long press on elements (mousedown without mouseup for a while)
 */
async function longPress(page, selector, duration = 3000) {
  const el = await page.$(selector);
  if (!el) return { action: 'longPress', result: 'not_found' };

  const box = await el.boundingBox();
  if (!box) return { action: 'longPress', result: 'no_bounding_box' };

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(duration);
  await page.mouse.up();
  return { action: 'longPress', selector, duration };
}


// ============================================================================
// MULTI-TAB CHAOS
// ============================================================================

/**
 * Open the same page in a new tab and perform conflicting actions
 */
async function multiTabConflict(page, context, callback) {
  const url = page.url();
  const page2 = await context.newPage();
  try {
    await page2.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    if (callback) await callback(page, page2);
  } finally {
    await page2.close().catch(() => {});
  }
  return { action: 'multiTabConflict', url };
}


// ============================================================================
// ACCESSIBILITY / FOCUS CHAOS
// ============================================================================

/**
 * Blur every focused element repeatedly (simulate losing focus)
 */
async function blurEverything(page, { cycles = 10, delay = 100 } = {}) {
  for (let i = 0; i < cycles; i++) {
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }).catch(() => {});
    await page.waitForTimeout(delay);
  }
  return { action: 'blurEverything', cycles };
}

/**
 * Focus random elements that normally aren't focused
 */
async function focusRandomElements(page) {
  const focused = await page.evaluate(() => {
    const all = document.querySelectorAll('div, span, p, h1, h2, h3, li, section, header, footer, main');
    const results = [];
    const sample = Array.from(all).sort(() => Math.random() - 0.5).slice(0, 10);
    for (const el of sample) {
      el.setAttribute('tabindex', '-1');
      el.focus();
      results.push(el.tagName + (el.id ? '#' + el.id : ''));
    }
    return results;
  }).catch(() => []);
  return { action: 'focusRandomElements', focused };
}


// ============================================================================
// DOM MUTATION CHAOS
// ============================================================================

/**
 * Remove random elements from the DOM
 */
async function removeRandomElements(page, { count = 3 } = {}) {
  const removed = await page.evaluate((count) => {
    const all = Array.from(document.querySelectorAll('div, section, article, aside, nav'));
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, count);
    const results = [];
    for (const el of shuffled) {
      const desc = `${el.tagName}#${el.id || ''}.${el.className?.toString().slice(0, 30) || ''}`;
      el.remove();
      results.push(desc);
    }
    return results;
  }, count).catch(() => []);
  return { action: 'removeRandomElements', removed };
}

/**
 * Inject unexpected elements into the DOM (overlays, popups)
 */
async function injectChaosElements(page) {
  await page.evaluate(() => {
    // Full-screen overlay
    const overlay = document.createElement('div');
    overlay.id = '__chaos_overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.1);z-index:99999;pointer-events:none;';
    document.body.appendChild(overlay);

    // Random floating element
    const floater = document.createElement('div');
    floater.id = '__chaos_floater';
    floater.style.cssText = 'position:fixed;top:50%;left:50%;width:300px;height:200px;background:white;border:2px solid red;z-index:100000;padding:20px;';
    floater.innerHTML = '<h2>CHAOS ELEMENT</h2><button onclick="this.parentElement.remove()">Close</button>';
    document.body.appendChild(floater);

    // Element that keeps growing
    const grower = document.createElement('div');
    grower.id = '__chaos_grower';
    grower.style.cssText = 'width:10px;height:10px;background:blue;position:absolute;top:0;left:0;transition:all 5s;';
    document.body.appendChild(grower);
    setTimeout(() => { grower.style.width = '5000px'; grower.style.height = '5000px'; }, 100);
  }).catch(() => {});
  return { action: 'injectChaosElements' };
}

/**
 * Remove injected chaos elements (cleanup)
 */
async function removeChaosElements(page) {
  await page.evaluate(() => {
    ['__chaos_overlay', '__chaos_floater', '__chaos_grower'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }).catch(() => {});
  return { action: 'removeChaosElements' };
}


// ============================================================================
// DIALOG/POPUP CHAOS
// ============================================================================

/**
 * Trigger native dialogs (alert, confirm, prompt) via JavaScript injection
 */
async function triggerNativeDialogs(page) {
  // Set up auto-dismiss for dialogs
  page.on('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.evaluate(() => {
    window.alert('Chaos: unexpected alert!');
  }).catch(() => {});

  await page.evaluate(() => {
    window.confirm('Chaos: unexpected confirm!');
  }).catch(() => {});

  await page.evaluate(() => {
    window.prompt('Chaos: unexpected prompt!');
  }).catch(() => {});

  return { action: 'triggerNativeDialogs' };
}

/**
 * Trigger window.print() to see if the app handles it
 */
async function triggerPrint(page) {
  // Override window.print to prevent actual print dialog
  await page.evaluate(() => {
    window.__originalPrint = window.print;
    window.print = () => console.log('CHAOS: print() intercepted');
  }).catch(() => {});
  await page.evaluate(() => window.print()).catch(() => {});
  return { action: 'triggerPrint' };
}


// ============================================================================
// TIME / DATE CHAOS
// ============================================================================

/**
 * Override Date to simulate time travel
 */
async function timeTravel(page, offsetMs = 86400000 * 365) {
  await page.evaluate((offset) => {
    const OriginalDate = window.__chaosOriginalDate || Date;
    window.__chaosOriginalDate = OriginalDate;

    window.Date = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(OriginalDate.now() + offset);
        } else {
          super(...args);
        }
      }
      static now() { return OriginalDate.now() + offset; }
    };
  }, offsetMs).catch(() => {});
  return { action: 'timeTravel', offsetMs, description: `+${Math.round(offsetMs / 86400000)} days` };
}

/**
 * Restore original Date after timeTravel
 */
async function restoreTime(page) {
  await page.evaluate(() => {
    if (window.__chaosOriginalDate) {
      window.Date = window.__chaosOriginalDate;
      delete window.__chaosOriginalDate;
    }
  }).catch(() => {});
  return { action: 'restoreTime' };
}


// ============================================================================
// PERFORMANCE STRESS
// ============================================================================

/**
 * Consume CPU by running heavy computation in the page
 */
async function cpuStress(page, durationMs = 3000) {
  await page.evaluate((duration) => {
    const end = Date.now() + duration;
    while (Date.now() < end) {
      Math.random() * Math.random();
    }
  }, durationMs).catch(() => {});
  return { action: 'cpuStress', durationMs };
}

/**
 * Consume memory by creating large arrays
 */
async function memoryStress(page, sizeMB = 50) {
  await page.evaluate((size) => {
    window.__chaosMemory = window.__chaosMemory || [];
    for (let i = 0; i < size; i++) {
      window.__chaosMemory.push(new ArrayBuffer(1024 * 1024)); // 1MB each
    }
  }, sizeMB).catch(() => {});
  return { action: 'memoryStress', sizeMB };
}

/**
 * Clean up memory stress
 */
async function cleanMemoryStress(page) {
  await page.evaluate(() => {
    delete window.__chaosMemory;
  }).catch(() => {});
  return { action: 'cleanMemoryStress' };
}


// ============================================================================
// COMPOUND SCENARIOS (combine multiple chaos actions)
// ============================================================================

/**
 * Impatient User: rapidly clicks, hits escape, clicks again, navigates away
 */
async function impatientUser(page) {
  const results = [];

  // Click something random rapidly
  const buttons = await page.$$('button, a, [role="button"]');
  if (buttons.length > 0) {
    const btn = buttons[Math.floor(Math.random() * buttons.length)];
    for (let i = 0; i < 3; i++) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(30);
    }
    results.push('rapid_clicks');
  }

  // Hit escape
  await page.keyboard.press('Escape');
  results.push('escape');

  // Hit back
  await page.goBack().catch(() => {});
  results.push('back');

  // Go forward
  await page.goForward().catch(() => {});
  results.push('forward');

  // Click something else
  if (buttons.length > 1) {
    const btn = buttons[Math.floor(Math.random() * buttons.length)];
    await btn.click({ force: true }).catch(() => {});
    results.push('final_click');
  }

  return { action: 'impatientUser', sequence: results };
}

/**
 * Distracted User: starts a flow, wanders off, comes back, tries to continue
 */
async function distractedUser(page, context) {
  const results = [];
  const originalUrl = page.url();

  // Open a new tab (gets distracted)
  const page2 = await context.newPage();
  await page2.goto('about:blank').catch(() => {});
  results.push('opened_new_tab');

  // Wait (user is reading something else)
  await page.waitForTimeout(2000);

  // Come back to original tab
  await page2.close();
  results.push('closed_distraction_tab');

  // Try to continue where they left off
  await page.bringToFront();
  results.push('returned_to_original');

  // Click something
  const interactable = await page.$$('button, a, input');
  if (interactable.length > 0) {
    const el = interactable[Math.floor(Math.random() * interactable.length)];
    await el.click({ force: true }).catch(() => {});
    results.push('resumed_interaction');
  }

  return { action: 'distractedUser', sequence: results };
}

/**
 * Rage Quitter: everything goes wrong, user thrashes the UI
 */
async function rageQuitter(page) {
  const results = [];

  // Spam random clicks
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    await page.mouse.click(x, y, { delay: 0 }).catch(() => {});
  }
  results.push('spam_clicks_20');

  // Spam keyboard
  const keys = 'asdfghjklqwertyuiop';
  for (const key of keys) {
    await page.keyboard.press(key).catch(() => {});
  }
  results.push('keyboard_spam');

  // Rapid scroll
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, Math.random() > 0.5 ? 1000 : -1000).catch(() => {});
  }
  results.push('scroll_spam');

  // Try to close everything
  await page.keyboard.press('Escape').catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  results.push('escape_spam');

  return { action: 'rageQuitter', sequence: results };
}

/**
 * Full random chaos session: run N random scenarios in sequence
 */
async function fullChaosSession(page, context, { rounds = 20, delay = 500 } = {}) {
  const soloScenarios = [
    () => clickRandomCoordinate(page),
    () => rapidResize(page, { cycles: 3, delay: 100 }),
    () => franticScroll(page, { actions: 5, delay: 50 }),
    () => keyboardSpam(page, { count: 10, delay: 10 }),
    () => escapeSpam(page, { count: 3, delay: 100 }),
    () => randomShortcuts(page),
    () => erraticHover(page, { moves: 10, delay: 30 }),
    () => randomMouseWheel(page, { events: 5 }),
    () => randomDrag(page),
    () => blurEverything(page, { cycles: 3, delay: 50 }),
    () => focusRandomElements(page),
    () => tabThroughPage(page, { count: 15, delay: 10 }),
    () => scrollDuringLoad(page),
    () => clickDisabledElements(page),
    () => rightClickEverywhere(page),
    () => impatientUser(page),
    () => rageQuitter(page),
  ];

  const results = [];
  for (let i = 0; i < rounds; i++) {
    const scenario = soloScenarios[Math.floor(Math.random() * soloScenarios.length)];
    try {
      const result = await scenario();
      results.push({ round: i + 1, ...result });
    } catch (e) {
      results.push({ round: i + 1, action: 'error', message: e.message });
    }
    await page.waitForTimeout(delay);
  }
  return { action: 'fullChaosSession', totalRounds: rounds, results };
}


// ============================================================================
// MONITORING / REPORTING
// ============================================================================

/**
 * Collect page health metrics: JS errors, console errors, broken images, etc.
 */
async function collectHealthMetrics(page) {
  const metrics = await page.evaluate(() => {
    const errors = [];

    // Check for broken images
    const images = document.querySelectorAll('img');
    const brokenImages = Array.from(images).filter(img => !img.complete || img.naturalWidth === 0);

    // Check for elements overflowing viewport
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 10 || rect.bottom > window.innerHeight * 3) {
        overflowing.push(`${el.tagName}#${el.id || ''}`);
      }
    });

    // Check for z-index wars
    const highZIndex = [];
    document.querySelectorAll('*').forEach(el => {
      const z = parseInt(getComputedStyle(el).zIndex);
      if (z > 10000) {
        highZIndex.push({ element: `${el.tagName}#${el.id || ''}`, zIndex: z });
      }
    });

    return {
      brokenImages: brokenImages.map(img => img.src).slice(0, 10),
      overflowingElements: overflowing.slice(0, 10),
      highZIndexElements: highZIndex.slice(0, 10),
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      totalDomNodes: document.querySelectorAll('*').length,
    };
  }).catch(() => ({}));

  return { action: 'collectHealthMetrics', ...metrics };
}

/**
 * Set up JS error listener and return a function to collect errors
 */
function setupErrorCollector(page) {
  const errors = [];
  const consoleErrors = [];

  page.on('pageerror', error => {
    errors.push({ message: error.message, stack: error.stack?.slice(0, 200) });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  return () => ({
    jsErrors: errors,
    consoleErrors: consoleErrors,
    totalErrors: errors.length + consoleErrors.length,
  });
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Click chaos
  rapidClick,
  unexpectedDblClick,
  clickRandomCoordinate,
  clickDisabledElements,
  rightClickEverywhere,
  clickDuringTransition,
  clickAndImmediatelyClickElsewhere,

  // Navigation chaos
  backDuringFlow,
  refreshMidAction,
  navigateAwayAndBack,
  rapidRouteToggle,
  deepLinkWithoutState,
  corruptUrl,

  // Form chaos
  submitEmptyForm,
  pasteGiantText,
  enterMaliciousInput,
  enterUnicodeEdgeCases,
  enterBoundaryNumbers,
  flickerSelect,
  fillClearSubmit,

  // Timing chaos
  doubleSubmit,
  interactWithSlowNetwork,
  offlineInteraction,
  interactDuringLoad,
  closeModalDuringAsync,

  // Viewport / layout chaos
  rapidResize,
  franticScroll,
  scrollDuringLoad,
  zoomChaos,

  // Keyboard chaos
  keyboardSpam,
  escapeSpam,
  tabThroughPage,
  randomShortcuts,
  typeWhileAutocompleteLoads,

  // State chaos
  clearLocalStorage,
  clearSessionStorage,
  corruptLocalStorage,
  clearCookies,
  killWebSockets,
  restoreWebSockets,
  expireAuthToken,

  // Gesture chaos
  randomDrag,
  erraticHover,
  randomMouseWheel,
  longPress,

  // Multi-tab chaos
  multiTabConflict,

  // Accessibility / focus chaos
  blurEverything,
  focusRandomElements,

  // DOM mutation chaos
  removeRandomElements,
  injectChaosElements,
  removeChaosElements,

  // Dialog / popup chaos
  triggerNativeDialogs,
  triggerPrint,

  // Time / date chaos
  timeTravel,
  restoreTime,

  // Performance stress
  cpuStress,
  memoryStress,
  cleanMemoryStress,

  // Compound scenarios
  impatientUser,
  distractedUser,
  rageQuitter,
  fullChaosSession,

  // Monitoring
  collectHealthMetrics,
  setupErrorCollector,
};
