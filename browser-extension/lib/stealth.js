/**
 * Stealth Mode - Fingerprint Randomization & Webdriver Hiding
 * This script runs at document_start to override navigator properties
 * before Cloudflare can detect automation
 */

(function() {
  'use strict';

  // Helper function to generate random number between min and max
  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Helper function to generate random plugins
  function generateRealPlugins() {
    return [
      {
        name: 'PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format'
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format'
      },
      {
        name: 'Chromium PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format'
      },
      {
        name: 'Microsoft Edge PDF Viewer',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format'
      },
      {
        name: 'WebKit built-in PDF',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format'
      }
    ];
  }

  // Override navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });

  // Override navigator.plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => generateRealPlugins(),
    configurable: true
  });

  // Override navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['tr-TR', 'tr', 'en-US', 'en'],
    configurable: true
  });

  // Override navigator.platform
  Object.defineProperty(navigator, 'platform', {
    get: () => 'Win32',
    configurable: true
  });

  // Override navigator.hardwareConcurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => randomBetween(4, 16),
    configurable: true
  });

  // Override navigator.deviceMemory
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => randomBetween(4, 32),
    configurable: true
  });

  // Override navigator.maxTouchPoints
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => 0,
    configurable: true
  });

  // Canvas fingerprint randomization
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const context = this.getContext('2d');
    if (context) {
      // Add subtle noise to canvas
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] += Math.random() * 0.01;
        imageData.data[i + 1] += Math.random() * 0.01;
        imageData.data[i + 2] += Math.random() * 0.01;
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
  };

  // WebGL fingerprint randomization
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
      return 'Intel Inc.';
    }
    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
      return 'Intel Iris OpenGL Engine';
    }
    return getParameter.apply(this, arguments);
  };

  // Audio fingerprint randomization
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      const oscillator = originalCreateOscillator.apply(this, arguments);
      const originalStart = oscillator.start;
      oscillator.start = function() {
        // Add subtle noise
        oscillator.frequency.value += Math.random() * 0.001;
        return originalStart.apply(this, arguments);
      };
      return oscillator;
    };
  }

  // Chrome runtime detection override
  if (window.chrome && window.chrome.runtime) {
    Object.defineProperty(window.chrome.runtime, 'connect', {
      get: () => undefined,
      configurable: true
    });
  }

  // Permissions API override
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = function(parameters) {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: 'default' });
    }
    return originalQuery.apply(this, arguments);
  };

  console.log('[Stealth] Fingerprint randomization applied');
})();


