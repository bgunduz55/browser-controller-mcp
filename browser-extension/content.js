/**
 * Content Script
 * Handles DOM manipulation, filter extraction, and Cloudflare challenge detection
 */

console.log('[Content] Script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 [Content] RECEIVED MESSAGE:', JSON.stringify(message, null, 2));

  switch (message.type) {
    case 'click':
      handleClick(message).then(sendResponse);
      break;

    case 'extract':
    case 'extract_data':
    case 'extract_table':
    case 'extract_links':
    case 'extract_images':
    case 'extract_text':
    case 'extract_attribute':
      handleExtract(message).then(sendResponse).catch(error => {
        sendResponse({ error: error.message });
      });
      break;

    case 'analyze':
      handleAnalyze(message).then(sendResponse);
      break;

    case 'checkCloudflare':
      sendResponse({ detected: detectCloudflareChallenge() });
      break;

    case 'waitForElement':
      waitForElement(message.selector, message.timeout).then(sendResponse);
      break;

    case 'type':
      handleType(message).then(sendResponse);
      break;

    case 'select':
      handleSelect(message).then(sendResponse);
      break;

    case 'check':
      handleCheck(message).then(sendResponse);
      break;

    case 'hover':
      handleHover(message).then(sendResponse);
      break;

    case 'scroll':
      handleScroll(message).then(sendResponse);
      break;

    case 'dragDrop':
      handleDragDrop(message).then(sendResponse);
      break;

    case 'upload':
      handleUpload(message).then(sendResponse);
      break;

    case 'evaluate':
      handleEvaluate(message).then(sendResponse);
      break;

    case 'getLocalStorage':
      handleGetLocalStorage(message).then(sendResponse);
      break;

    case 'setLocalStorage':
      handleSetLocalStorage(message).then(sendResponse);
      break;

    case 'getSessionStorage':
      handleGetSessionStorage(message).then(sendResponse);
      break;

    case 'setSessionStorage':
      handleSetSessionStorage(message).then(sendResponse);
      break;

    case 'clearStorage':
      handleClearStorage(message).then(sendResponse);
      break;

    case 'waitForSelector':
      handleWaitForSelector(message).then(sendResponse);
      break;

    case 'waitForText':
      handleWaitForText(message).then(sendResponse);
      break;

    case 'waitForNavigation':
      handleWaitForNavigation(message).then(sendResponse);
      break;

    case 'waitForNetworkIdle':
      handleWaitForNetworkIdle(message).then(sendResponse);
      break;

    case 'evaluate':
    case 'evaluate_js':
      handleEvaluate(message).then(sendResponse).catch(error => {
        sendResponse({ error: error.message });
      });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep message channel open for async response
});

// Handle click command
async function handleClick(message) {
  const { selector, humanLike, timeout } = message;

  try {
    const element = await waitForElement(selector, timeout);
    
    if (humanLike) {
      await humanClick(element);
    } else {
      element.click();
    }

    console.log('✅ [Content] CLICK SUCCESS');
    return { success: true, clicked: true };
  } catch (error) {
    console.log('❌ [Content] CLICK ERROR:', error.message);
    throw new Error(`Click failed: ${error.message}`);
  }
}

// Handle extract command
async function handleExtract(message) {
  const { 
    selector, 
    category, 
    includeHidden, 
    depth, 
    includeText, 
    includeAttributes, 
    maxElements,
    extractType,
    type 
  } = message;

  try {
    // If selector is provided, use generic extraction
    if (selector) {
      console.log(`🔍 [Content] EXTRACTING DATA with selector: ${selector}, type: ${type || extractType}`);
      
      let result;
      
      // Use specialized extraction based on type or extractType
      const extractionType = type || extractType || 'generic';
      
      switch (extractionType) {
        case 'table':
        case 'extract_table':
          result = await extractTable(selector, maxElements);
          break;
        case 'links':
        case 'extract_links':
          result = await extractLinks(selector, maxElements);
          break;
        case 'images':
        case 'extract_images':
          result = await extractImages(selector, maxElements);
          break;
        case 'text':
        case 'extract_text':
          result = await extractText(selector, maxElements);
          break;
        case 'attributes':
        case 'extract_attribute':
          result = await extractAttributes(selector, includeAttributes, maxElements);
          break;
        default:
          result = await extractGeneric(selector, includeText, includeAttributes, maxElements);
      }
      
      console.log('✅ [Content] EXTRACT SUCCESS:', JSON.stringify(result, null, 2));
      return result;
    }
    
    // Otherwise, use filter extraction for general websites
    console.log(`🔍 [Content] EXTRACTING FILTERS for category: ${category}`);
    const filters = await extractFilters(category, includeHidden);
    
    const result = {
      category,
      filters,
      metadata: {
        extractedAt: Date.now(),
        pageUrl: window.location.href,
        totalFilters: filters.length
      }
    };
    console.log('✅ [Content] EXTRACT SUCCESS:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.log('❌ [Content] EXTRACT ERROR:', error.message);
    throw new Error(`Extract failed: ${error.message}`);
  }
}

// Handle analyze command
async function handleAnalyze(message) {
  try {
    const analysis = {
      url: window.location.href,
      title: document.title,
      structure: {
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input').length,
        selects: document.querySelectorAll('select').length,
        buttons: document.querySelectorAll('button').length
      },
      performance: {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        resourcesLoaded: performance.getEntriesByType('resource').length
      },
      cloudflare: {
        detected: detectCloudflareChallenge()
      }
    };

    return analysis;
  } catch (error) {
    throw new Error(`Analyze failed: ${error.message}`);
  }
}

// Extract filters from page
async function extractFilters(category, includeHidden) {
  console.log('[Content] Extracting filters for category:', category);

  // Find all form elements
  const formElements = document.querySelectorAll('input, select, textarea');
  const filters = [];

  for (const element of formElements) {
    // Skip hidden elements unless requested
    if (!includeHidden && !isElementVisible(element)) {
      continue;
    }

    const filter = analyzeElement(element);
    if (filter && !shouldExclude(filter)) {
      filters.push(filter);
    }
  }

  console.log(`[Content] Extracted ${filters.length} filters`);
  return filters;
}

// Analyze element and extract filter info
function analyzeElement(element) {
  // Detect element type
  const type = detectElementType(element);
  if (!type) return null;

  // Extract name/id
  const name = element.getAttribute('name') || 
                element.getAttribute('id') || 
                element.getAttribute('data-name');
  if (!name) return null;

  // Extract label
  const label = extractLabel(element);

  // Extract values/options
  const values = extractValues(element, type);

  // Determine rules
  const rules = determineRules(element, type, values);

  // Get selector
  const selector = generateSelector(element);

  return {
    name,
    label,
    type,
    selector,
    values,
    rules
  };
}

// Detect element type
function detectElementType(element) {
  if (element.tagName === 'SELECT') {
    return 'ENUM';
  }

  if (element.tagName === 'INPUT') {
    const inputType = element.getAttribute('type');

    switch (inputType) {
      case 'number':
      case 'range':
        return 'NUMBER';
      case 'checkbox':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'text':
      case 'search':
        return 'STRING';
      default:
        return null;
    }
  }

  if (element.tagName === 'TEXTAREA') {
    return 'STRING';
  }

  return null;
}

// Extract label for element
function extractLabel(element) {
  // Try label element
  const labelElement = document.querySelector(`label[for="${element.id}"]`);
  if (labelElement) {
    return labelElement.textContent.trim();
  }

  // Try parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.trim();
  }

  // Try placeholder
  if (element.placeholder) {
    return element.placeholder;
  }

  // Try aria-label
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }

  return element.name || element.id || 'Unknown';
}

// Extract values/options
function extractValues(element, type) {
  if (type === 'ENUM' && element.tagName === 'SELECT') {
    const options = Array.from(element.options);
    return options.map(opt => opt.value || opt.text).filter(Boolean);
  }

  if (type === 'NUMBER') {
    return {
      min: element.min || 0,
      max: element.max || 999999
    };
  }

  return null;
}

// Determine rules for element
function determineRules(element, type, values) {
  const rules = {
    isRequired: element.required || false,
    isUnique: false
  };

  if (type === 'NUMBER') {
    rules.min = values.min;
    rules.max = values.max;
  }

  if (type === 'ENUM' && Array.isArray(values)) {
    rules.enumValues = values;
  }

  return rules;
}

// Generate unique selector for element
function generateSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.name) {
    return `[name="${element.name}"]`;
  }

  // Generate path-based selector
  const path = [];
  let current = element;
  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();
    if (current.className) {
      selector += '.' + current.className.split(' ').join('.');
    }
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Check if element should be excluded
function shouldExclude(filter) {
  const exclusionRules = [
    // Temel filtreler
    (f) => f.name === 'fiyat' || f.name === 'price',
    (f) => f.name === 'adres' || f.name === 'address',
    (f) => f.name === 'ilan_tarihi' || f.name === 'date',
    (f) => f.name === 'siralama' || f.name === 'sort',

    // Notice entity properties
    (f) => f.name === 'kimden' || f.name === 'from',
    (f) => f.name === 'takasli' || f.name === 'exchange',
    (f) => f.name === 'videolu' || f.name === 'video',
    (f) => f.name === 'fotograf' || f.name === 'photo',

    // Marka filtreleri
    (f) => f.name === 'marka' || f.name === 'brand',
    (f) => f.name === 'model',

    // Image/media properties
    (f) => f.label?.includes('Fotoğraf'),
    (f) => f.label?.includes('Video'),
    (f) => f.label?.includes('Görsel')
  ];

  return exclusionRules.some(rule => rule(filter));
}

// Detect Cloudflare challenge
function detectCloudflareChallenge() {
  const indicators = [
    // URL patterns
    () => window.location.href.includes('cdn-cgi/challenge-platform'),
    () => window.location.href.includes('/cs/checkLoading'),

    // DOM elements
    () => document.querySelector('#challenge-running'),
    () => document.querySelector('.cf-browser-verification'),
    () => document.title.includes('Just a moment'),

    // Text content
    () => document.body.textContent.includes('Verifying you are human'),
    () => document.body.textContent.includes('Checking your browser'),
    () => document.body.textContent.includes('Olağandışı bir durum tespit ettik')
  ];

  return indicators.some(check => check());
}

// Wait for element to appear
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeout);
  });
}

// Check if element is visible
function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0';
}

// Human-like click
async function humanClick(element) {
  // Scroll to element
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(randomBetween(100, 300));

  // Move mouse to element (simulate)
  const rect = element.getBoundingClientRect();
  console.log(`[Content] Clicking at (${rect.left + rect.width / 2}, ${rect.top + rect.height / 2})`);

  // Random delay before click
  await sleep(randomBetween(50, 150));

  // Click
  element.click();

  // Random delay after click
  await sleep(randomBetween(100, 300));
}

// Helper: Random number between min and max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// SPECIALIZED EXTRACTION FUNCTIONS
// ========================================

// Generic extraction (default)
async function extractGeneric(selector, includeText, includeAttributes, maxElements) {
  const elements = document.querySelectorAll(selector);
  const data = [];
  const limit = maxElements || 100;
  
  for (let i = 0; i < Math.min(elements.length, limit); i++) {
    const el = elements[i];
    const item = {};
    
    if (includeText) {
      item.text = el.textContent?.trim() || '';
    }
    
    if (includeAttributes) {
      item.attributes = {};
      for (const attr of el.attributes) {
        item.attributes[attr.name] = attr.value;
      }
    }
    
    data.push(item);
  }
  
  return {
    selector,
    data,
    metadata: {
      extractedAt: Date.now(),
      pageUrl: window.location.href,
      totalElements: elements.length,
      returnedElements: data.length
    }
  };
}

// Table extraction
async function extractTable(selector, maxElements) {
  const tables = document.querySelectorAll(selector);
  const data = [];
  const limit = maxElements || 10;
  
  for (let i = 0; i < Math.min(tables.length, limit); i++) {
    const table = tables[i];
    const tableData = {
      headers: [],
      rows: [],
      metadata: {
        rowCount: 0,
        colCount: 0
      }
    };
    
    // Extract headers
    const headerCells = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
    headerCells.forEach(cell => {
      tableData.headers.push(cell.textContent?.trim() || '');
    });
    
    // Extract rows
    const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
    rows.forEach(row => {
      const rowData = [];
      const cells = row.querySelectorAll('td, th');
      cells.forEach(cell => {
        rowData.push(cell.textContent?.trim() || '');
      });
      if (rowData.length > 0) {
        tableData.rows.push(rowData);
      }
    });
    
    tableData.metadata.rowCount = tableData.rows.length;
    tableData.metadata.colCount = tableData.headers.length || (tableData.rows[0]?.length || 0);
    
    data.push(tableData);
  }
  
  return {
    selector,
    data,
    metadata: {
      extractedAt: Date.now(),
      pageUrl: window.location.href,
      totalTables: tables.length,
      returnedTables: data.length
    }
  };
}

// Links extraction
async function extractLinks(selector, maxElements) {
  const links = document.querySelectorAll(selector);
  const data = [];
  const limit = maxElements || 100;
  
  for (let i = 0; i < Math.min(links.length, limit); i++) {
    const link = links[i];
    const linkData = {
      text: link.textContent?.trim() || '',
      href: link.href || '',
      title: link.title || '',
      target: link.target || '',
      attributes: {}
    };
    
    // Extract all attributes
    for (const attr of link.attributes) {
      linkData.attributes[attr.name] = attr.value;
    }
    
    data.push(linkData);
  }
  
  return {
    selector,
    data,
    metadata: {
      extractedAt: Date.now(),
      pageUrl: window.location.href,
      totalLinks: links.length,
      returnedLinks: data.length
    }
  };
}

// Images extraction
async function extractImages(selector, maxElements) {
  const images = document.querySelectorAll(selector);
  const data = [];
  const limit = maxElements || 100;
  
  for (let i = 0; i < Math.min(images.length, limit); i++) {
    const img = images[i];
    const imageData = {
      src: img.src || '',
      alt: img.alt || '',
      title: img.title || '',
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0,
      attributes: {}
    };
    
    // Extract all attributes
    for (const attr of img.attributes) {
      imageData.attributes[attr.name] = attr.value;
    }
    
    data.push(imageData);
  }
  
  return {
    selector,
    data,
    metadata: {
      extractedAt: Date.now(),
      pageUrl: window.location.href,
      totalImages: images.length,
      returnedImages: data.length
    }
  };
}

// Text extraction
async function extractText(selector, maxElements) {
  const elements = document.querySelectorAll(selector);
  const data = [];
  const limit = maxElements || 100;
  
  for (let i = 0; i < Math.min(elements.length, limit); i++) {
    const el = elements[i];
    const textData = {
      text: el.textContent?.trim() || '',
      innerHTML: el.innerHTML || '',
      tagName: el.tagName?.toLowerCase() || '',
      className: el.className || '',
      id: el.id || ''
    };
    
    data.push(textData);
  }
  
  return {
    selector,
    data,
    metadata: {
      extractedAt: Date.now(),
      pageUrl: window.location.href,
      totalElements: elements.length,
      returnedElements: data.length
    }
  };
}

// Attributes extraction
async function extractAttributes(selector, includeAttributes, maxElements) {
  const elements = document.querySelectorAll(selector);
  const data = [];
  const limit = maxElements || 100;
  
  for (let i = 0; i < Math.min(elements.length, limit); i++) {
    const el = elements[i];
    const attrData = {
      tagName: el.tagName?.toLowerCase() || '',
      className: el.className || '',
      id: el.id || '',
      attributes: {}
    };
    
    // Extract all attributes
    for (const attr of el.attributes) {
      attrData.attributes[attr.name] = attr.value;
    }
    
    data.push(attrData);
  }
  
  return {
    selector,
    data,
    metadata: {
      extractedAt: Date.now(),
      pageUrl: window.location.href,
      totalElements: elements.length,
      returnedElements: data.length
    }
  };
}

// ========================================
// DOM MANIPULATION FUNCTIONS
// ========================================

// Handle type command
async function handleType(message) {
  const { selector, text, humanLike, clear, timeout } = message;

  try {
    const element = await waitForElement(selector, timeout);
    
    if (clear) {
      element.value = '';
    }
    
    if (humanLike) {
      await humanType(element, text);
    } else {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return {
      success: true,
      selector,
      text,
      element: {
        tagName: element.tagName,
        type: element.type,
        value: element.value
      }
    };
  } catch (error) {
    throw new Error(`Type failed: ${error.message}`);
  }
}

// Handle select command
async function handleSelect(message) {
  const { selector, value, text, index, timeout } = message;

  try {
    const element = await waitForElement(selector, timeout);
    
    if (element.tagName.toLowerCase() !== 'select') {
      throw new Error('Element is not a select element');
    }

    let option;
    if (value !== undefined) {
      option = element.querySelector(`option[value="${value}"]`);
    } else if (text !== undefined) {
      option = Array.from(element.options).find(opt => opt.textContent.trim() === text);
    } else if (index !== undefined) {
      option = element.options[index];
    } else {
      throw new Error('Must specify value, text, or index');
    }

    if (!option) {
      throw new Error('Option not found');
    }

    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      selector,
      selectedValue: option.value,
      selectedText: option.textContent.trim(),
      selectedIndex: option.index
    };
  } catch (error) {
    throw new Error(`Select failed: ${error.message}`);
  }
}

// Handle check command
async function handleCheck(message) {
  const { selector, checked, timeout } = message;

  try {
    const element = await waitForElement(selector, timeout);
    
    if (element.type !== 'checkbox' && element.type !== 'radio') {
      throw new Error('Element is not a checkbox or radio button');
    }

    const wasChecked = element.checked;
    element.checked = checked !== undefined ? checked : !wasChecked;
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('click', { bubbles: true }));

    return {
      success: true,
      selector,
      checked: element.checked,
      wasChecked
    };
  } catch (error) {
    throw new Error(`Check failed: ${error.message}`);
  }
}

// Handle hover command
async function handleHover(message) {
  const { selector, timeout } = message;

  try {
    const element = await waitForElement(selector, timeout);
    
    // Trigger mouse events
    const mouseOverEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    const mouseEnterEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(mouseOverEvent);
    element.dispatchEvent(mouseEnterEvent);

    return {
      success: true,
      selector,
      element: {
        tagName: element.tagName,
        className: element.className
      }
    };
  } catch (error) {
    throw new Error(`Hover failed: ${error.message}`);
  }
}

// Handle scroll command
async function handleScroll(message) {
  const { selector, behavior, block, inline, timeout } = message;

  try {
    if (selector) {
      const element = await waitForElement(selector, timeout);
      element.scrollIntoView({
        behavior: behavior || 'smooth',
        block: block || 'center',
        inline: inline || 'nearest'
      });
    } else {
      // Scroll window
      const { x, y } = message;
      window.scrollTo({
        left: x || 0,
        top: y || 0,
        behavior: behavior || 'smooth'
      });
    }

    return {
      success: true,
      selector: selector || 'window',
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      }
    };
  } catch (error) {
    throw new Error(`Scroll failed: ${error.message}`);
  }
}

// Handle drag and drop command
async function handleDragDrop(message) {
  const { sourceSelector, targetSelector, timeout } = message;

  try {
    const sourceElement = await waitForElement(sourceSelector, timeout);
    const targetElement = await waitForElement(targetSelector, timeout);

    // Create drag events
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });

    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });

    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });

    const dragEndEvent = new DragEvent('dragend', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });

    // Trigger drag start
    sourceElement.dispatchEvent(dragStartEvent);
    
    // Trigger drag over on target
    targetElement.dispatchEvent(dragOverEvent);
    
    // Trigger drop
    targetElement.dispatchEvent(dropEvent);
    
    // Trigger drag end
    sourceElement.dispatchEvent(dragEndEvent);

    return {
      success: true,
      sourceSelector,
      targetSelector,
      sourceElement: {
        tagName: sourceElement.tagName,
        className: sourceElement.className
      },
      targetElement: {
        tagName: targetElement.tagName,
        className: targetElement.className
      }
    };
  } catch (error) {
    throw new Error(`DragDrop failed: ${error.message}`);
  }
}

// Handle upload command
async function handleUpload(message) {
  const { selector, files, timeout } = message;

  try {
    const element = await waitForElement(selector, timeout);
    
    if (element.type !== 'file') {
      throw new Error('Element is not a file input');
    }

    // Create FileList-like object
    const fileList = new DataTransfer();
    
    if (Array.isArray(files)) {
      files.forEach(fileData => {
        const file = new File([fileData.content || ''], fileData.name, {
          type: fileData.type || 'text/plain'
        });
        fileList.items.add(file);
      });
    }

    element.files = fileList.files;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      selector,
      filesUploaded: element.files.length,
      fileNames: Array.from(element.files).map(f => f.name)
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

// Handle evaluate command
// async function handleEvaluate(message) {
//   const { code, timeout } = message;

//   try {
//     // Execute JavaScript code safely
//     const result = await new Promise((resolve, reject) => {
//       const timeoutId = setTimeout(() => {
//         reject(new Error('Evaluation timeout'));
//       }, timeout || 5000);

//       try {
//         const evalResult = eval(code);
//         clearTimeout(timeoutId);
//         resolve(evalResult);
//       } catch (error) {
//         clearTimeout(timeoutId);
//         reject(error);
//       }
//     });

//     return {
//       success: true,
//       code,
//       result,
//       type: typeof result
//     };
//   } catch (error) {
//     throw new Error(`Evaluate failed: ${error.message}`);
//   }
// }

// Human-like typing simulation
async function humanType(element, text) {
  const delay = () => sleep(randomBetween(50, 150));
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await delay();
  }
  
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ========================================
// STORAGE MANAGEMENT FUNCTIONS
// ========================================

// Handle get localStorage command
async function handleGetLocalStorage(message) {
  const { key } = message;

  try {
    if (key) {
      const value = localStorage.getItem(key);
      return {
        success: true,
        key,
        value,
        exists: value !== null
      };
    } else {
      // Get all localStorage items
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items[key] = localStorage.getItem(key);
        }
      }
      
      return {
        success: true,
        items,
        count: Object.keys(items).length
      };
    }
  } catch (error) {
    throw new Error(`Get localStorage failed: ${error.message}`);
  }
}

// Handle set localStorage command
async function handleSetLocalStorage(message) {
  const { key, value } = message;

  try {
    localStorage.setItem(key, value);
    
    return {
      success: true,
      key,
      value,
      message: 'localStorage item set successfully'
    };
  } catch (error) {
    throw new Error(`Set localStorage failed: ${error.message}`);
  }
}

// Handle get sessionStorage command
async function handleGetSessionStorage(message) {
  const { key } = message;

  try {
    if (key) {
      const value = sessionStorage.getItem(key);
      return {
        success: true,
        key,
        value,
        exists: value !== null
      };
    } else {
      // Get all sessionStorage items
      const items = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          items[key] = sessionStorage.getItem(key);
        }
      }
      
      return {
        success: true,
        items,
        count: Object.keys(items).length
      };
    }
  } catch (error) {
    throw new Error(`Get sessionStorage failed: ${error.message}`);
  }
}

// Handle set sessionStorage command
async function handleSetSessionStorage(message) {
  const { key, value } = message;

  try {
    sessionStorage.setItem(key, value);
    
    return {
      success: true,
      key,
      value,
      message: 'sessionStorage item set successfully'
    };
  } catch (error) {
    throw new Error(`Set sessionStorage failed: ${error.message}`);
  }
}

// Handle clear storage command
async function handleClearStorage(message) {
  const { storageType } = message;

  try {
    let cleared = [];
    
    if (storageType === 'localStorage' || storageType === 'both') {
      const localCount = localStorage.length;
      localStorage.clear();
      cleared.push(`localStorage (${localCount} items)`);
    }
    
    if (storageType === 'sessionStorage' || storageType === 'both') {
      const sessionCount = sessionStorage.length;
      sessionStorage.clear();
      cleared.push(`sessionStorage (${sessionCount} items)`);
    }
    
    return {
      success: true,
      cleared,
      message: `Cleared: ${cleared.join(', ')}`
    };
  } catch (error) {
    throw new Error(`Clear storage failed: ${error.message}`);
  }
}

// ========================================
// ENHANCED WAIT STRATEGIES
// ========================================

// Handle wait for selector command
async function handleWaitForSelector(message) {
  const { selector, timeout, visible, hidden } = message;

  try {
    const startTime = Date.now();
    const maxTime = timeout || 30000;
    
    while (Date.now() - startTime < maxTime) {
      const elements = document.querySelectorAll(selector);
      
      if (elements.length > 0) {
        const element = elements[0];
        const isVisible = element.offsetParent !== null;
        const isHidden = !isVisible;
        
        if (visible && isVisible) {
          return {
            success: true,
            selector,
            found: true,
            visible: isVisible,
            element: {
              tagName: element.tagName,
              className: element.className,
              id: element.id
            },
            waitTime: Date.now() - startTime
          };
        }
        
        if (hidden && isHidden) {
          return {
            success: true,
            selector,
            found: true,
            visible: isVisible,
            element: {
              tagName: element.tagName,
              className: element.className,
              id: element.id
            },
            waitTime: Date.now() - startTime
          };
        }
        
        if (!visible && !hidden) {
          return {
            success: true,
            selector,
            found: true,
            visible: isVisible,
            element: {
              tagName: element.tagName,
              className: element.className,
              id: element.id
            },
            waitTime: Date.now() - startTime
          };
        }
      }
      
      await sleep(100);
    }
    
    return {
      success: false,
      selector,
      found: false,
      timeout: true,
      waitTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Wait for selector failed: ${error.message}`);
  }
}

// Handle wait for text command
async function handleWaitForText(message) {
  const { text, selector, timeout, exact } = message;

  try {
    const startTime = Date.now();
    const maxTime = timeout || 30000;
    
    while (Date.now() - startTime < maxTime) {
      let elements;
      
      if (selector) {
        elements = document.querySelectorAll(selector);
      } else {
        elements = [document.body];
      }
      
      for (const element of elements) {
        const elementText = element.textContent || '';
        
        let found = false;
        if (exact) {
          found = elementText === text;
        } else {
          found = elementText.includes(text);
        }
        
        if (found) {
          return {
            success: true,
            text,
            selector: selector || 'document.body',
            found: true,
            exact,
            element: {
              tagName: element.tagName,
              className: element.className,
              id: element.id
            },
            waitTime: Date.now() - startTime
          };
        }
      }
      
      await sleep(100);
    }
    
    return {
      success: false,
      text,
      selector: selector || 'document.body',
      found: false,
      timeout: true,
      waitTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Wait for text failed: ${error.message}`);
  }
}

// Handle wait for navigation command
async function handleWaitForNavigation(message) {
  const { timeout, waitUntil } = message;

  try {
    const startTime = Date.now();
    const maxTime = timeout || 30000;
    
    return new Promise((resolve) => {
      const checkCondition = () => {
        if (Date.now() - startTime > maxTime) {
          resolve({
            success: false,
            waitUntil,
            timeout: true,
            waitTime: Date.now() - startTime
          });
          return;
        }
        
        let conditionMet = false;
        
        switch (waitUntil) {
          case 'load':
            conditionMet = document.readyState === 'complete';
            break;
          case 'domcontentloaded':
            conditionMet = document.readyState === 'interactive' || document.readyState === 'complete';
            break;
          case 'networkidle':
            // Simple network idle check - no active requests
            conditionMet = performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0;
            break;
          default:
            conditionMet = document.readyState === 'complete';
        }
        
        if (conditionMet) {
          resolve({
            success: true,
            waitUntil,
            readyState: document.readyState,
            waitTime: Date.now() - startTime
          });
        } else {
          setTimeout(checkCondition, 100);
        }
      };
      
      checkCondition();
    });
  } catch (error) {
    throw new Error(`Wait for navigation failed: ${error.message}`);
  }
}

// Handle wait for network idle command
async function handleWaitForNetworkIdle(message) {
  const { timeout, idleTime } = message;

  try {
    const startTime = Date.now();
    const maxTime = timeout || 30000;
    const requiredIdleTime = idleTime || 500;
    let lastActivityTime = Date.now();
    
    return new Promise((resolve) => {
      const checkIdle = () => {
        if (Date.now() - startTime > maxTime) {
          resolve({
            success: false,
            idleTime: requiredIdleTime,
            timeout: true,
            waitTime: Date.now() - startTime
          });
          return;
        }
        
        // Check if we've been idle for the required time
        if (Date.now() - lastActivityTime >= requiredIdleTime) {
          resolve({
            success: true,
            idleTime: requiredIdleTime,
            actualIdleTime: Date.now() - lastActivityTime,
            waitTime: Date.now() - startTime
          });
        } else {
          // Reset idle time if there's activity
          const currentTime = Date.now();
          if (currentTime - lastActivityTime < 100) {
            lastActivityTime = currentTime;
          }
          setTimeout(checkIdle, 100);
        }
      };
      
      checkIdle();
    });
  } catch (error) {
    throw new Error(`Wait for network idle failed: ${error.message}`);
  }
}

// Handle evaluate JavaScript command
async function handleEvaluate(message) {
  const { code } = message;

  try {
    console.log('🔧 [Content] EXECUTING JAVASCRIPT:', code.substring(0, 100) + '...');
    
    // Execute the JavaScript code using DOM manipulation to bypass CSP
    const script = document.createElement('script');
    const resultId = 'eval-result-' + Date.now();
    
    // Create a result container
    const resultContainer = document.createElement('div');
    resultContainer.id = resultId;
    resultContainer.style.display = 'none';
    document.body.appendChild(resultContainer);
    
    // Wrap the code to capture the result
    const wrappedCode = `
      (function() {
        try {
          const result = (function() { ${code} })();
          document.getElementById('${resultId}').setAttribute('data-result', JSON.stringify({
            success: true,
            result: result,
            executedAt: ${Date.now()}
          }));
        } catch (error) {
          document.getElementById('${resultId}').setAttribute('data-result', JSON.stringify({
            success: false,
            error: error.message,
            executedAt: ${Date.now()}
          }));
        }
      })();
    `;
    
    script.textContent = wrappedCode;
    document.head.appendChild(script);
    
    // Wait for the script to execute
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Get the result
    const resultData = resultContainer.getAttribute('data-result');
    const result = resultData ? JSON.parse(resultData) : { success: false, error: 'No result captured' };
    
    // Clean up
    document.head.removeChild(script);
    document.body.removeChild(resultContainer);
    
    console.log('✅ [Content] JAVASCRIPT EXECUTED SUCCESSFULLY');
    return result;
  } catch (error) {
    console.log('❌ [Content] JAVASCRIPT EXECUTION ERROR:', error.message);
    return {
      success: false,
      error: error.message,
      executedAt: Date.now()
    };
  }
}

console.log('[Content] Ready');


