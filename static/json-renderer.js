/**
 * Base class for rendering JSON to HTML
 */
export class JsonRenderer {
  /**
   * Creates a new JsonRenderer instance
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      colorize: true,
      ...options
    };
    
    // Registry for type-specific renderers
    this.typeRenderers = {};
  }
  
  /**
   * Registers a renderer for a specific type
   * 
   * @param {string} type - The type to register for
   * @param {Function} renderer - The renderer function
   */
  registerTypeRenderer(type, renderer) {
    this.typeRenderers[type] = renderer;
  }
  
  /**
   * Renders JSON as HTML for display
   * 
   * @param {Object|string} json - The JSON to render
   * @returns {string} - HTML representation of the JSON
   */
  render(json) {
    try {
      const parsed = (typeof json === 'string') ? JSON.parse(json) : json;
      const formatted = this.formatObject(parsed);
      
      if (this.options.colorize) {
        return this.wrapWithStyles(formatted);
      }
      
      return `<pre class="json-ld"><code>${formatted}</code></pre>`;
    } catch (error) {
      return `<pre class="json-ld error">Error: ${this.escapeHtml(error.message)}</pre>`;
    }
  }
  
  /**
   * Creates an HTML element for a JSON item
   * 
   * @param {Object} item - The item data
   * @returns {HTMLElement} - The HTML element
   */
  createJsonItemHtml(item) {
    // Check if there's a type-specific renderer
    if (item.schema_object && item.schema_object['@type']) {
      const type = item.schema_object['@type'];
      if (Object.prototype.hasOwnProperty.call(this.typeRenderers, type) && typeof this.typeRenderers[type] === 'function') {
        return this.typeRenderers[type](item, this);
      }
    }
    
    // Use default renderer if no type-specific renderer exists
    return this.createDefaultItemHtml(item);
  }
  
  /**
   * Creates default HTML for a JSON item
   * 
   * @param {Object} item - The item data
   * @returns {HTMLElement} - The HTML element
   */
  createDefaultItemHtml(item) {
    // Safely create container elements
    const container = document.createElement('div');
    container.className = 'item-container';

    // Left content div (title + description)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    // Title row with link and info icon
    this.createTitleRow(item, contentDiv);

    // Description
    const description = document.createElement('div');
    // Use textContent for safe insertion of description
    description.textContent = item.description || '';
    description.className = 'item-description';
    contentDiv.appendChild(description);

    // Add explanation if available
    this.possiblyAddExplanation(item, contentDiv);

    container.appendChild(contentDiv);

    // Add image if available
    this.addImageIfAvailable(item, container);

    return container;
  }
  
  /**
   * Creates a title row for an item
   * 
   * @param {Object} item - The item data
   * @param {HTMLElement} contentDiv - The content div
   */
  createTitleRow(item, contentDiv) {
    const titleRow = document.createElement('div');
    titleRow.className = 'item-title-row';

    // Title/link
    const titleLink = document.createElement('a');
    titleLink.href = item.url ? this.escapeHtml(item.url) : '#'; // Sanitize URL
    const itemName = this.getItemName(item);
    // Safe text insertion
    titleLink.textContent = itemName;
    titleLink.className = 'item-title-link';
    titleRow.appendChild(titleLink);

    // Info icon
    const infoIcon = document.createElement('span');
    // Use a safer way to create the icon
    const imgElement = document.createElement('img');
    imgElement.src = 'images/info.png';
    imgElement.alt = 'Info';
    infoIcon.appendChild(imgElement);
    
    infoIcon.className = 'item-info-icon';
    // Sanitize tooltip content
    infoIcon.title = `${this.escapeHtml(item.explanation || '')} (score=${item.score || 0}) (Ranking time=${item.time || 0})`;
    titleRow.appendChild(infoIcon);

    contentDiv.appendChild(titleRow);
  }
  
  /**
   * Adds a visible URL to the content div
   * 
   * @param {Object} item - The item data
   * @param {HTMLElement} contentDiv - The content div
   */
  addVisibleUrl(item, contentDiv) {
    const visibleUrlLink = document.createElement("a");
    // Sanitize URL
    visibleUrlLink.href = item.siteUrl ? this.escapeHtml(item.siteUrl) : '#';
    // Use textContent for safe insertion
    visibleUrlLink.textContent = item.site || '';
    visibleUrlLink.className = 'item-site-link';
    contentDiv.appendChild(visibleUrlLink);
  }
  
  /**
   * Gets the name of an item
   * 
   * @param {Object} item - The item data
   * @returns {string} - The item name
   */
  getItemName(item) {
    let name = '';
    if (item.name) {
      name = item.name;
    } else if (item.schema_object && item.schema_object.keywords) {
      name = item.schema_object.keywords;
    } else if (item.url) {
      name = item.url;
    }
    return name;
  }
  
  /**
   * Adds an image to the item if available
   * 
   * @param {Object} item - The item data
   * @param {HTMLElement} container - The container element
   */
  addImageIfAvailable(item, container) {
    if (item.schema_object) {
      const imgURL = this.extractImage(item.schema_object);
      if (imgURL) {
        const imageDiv = document.createElement('div');
        const img = document.createElement('img');
        // Sanitize URL
        img.src = this.escapeHtml(imgURL);
        img.alt = 'Item image';
        img.className = 'item-image';
        imageDiv.appendChild(img);
        container.appendChild(imageDiv);
      }
    }
  }
  
  /**
   * Extracts an image URL from a schema object
   * 
   * @param {Object} schema_object - The schema object
   * @returns {string|null} - The image URL or null
   */
  extractImage(schema_object) {
    if (schema_object && schema_object.image) {
      return this.extractImageInternal(schema_object.image);
    }
    return null;
  }

  /**
   * Extracts an image URL from various image formats
   * 
   * @param {*} image - The image data
   * @returns {string|null} - The image URL or null
   */
  extractImageInternal(image) {
    if (typeof image === 'string') {
      return image;
    } else if (typeof image === 'object' && image.url) {
      return image.url;
    } else if (typeof image === 'object' && image.contentUrl) {
      return image.contentUrl;
    } else if (Array.isArray(image)) {
      if (image[0] && typeof image[0] === 'string') {
        return image[0];
      } else if (image[0] && typeof image[0] === 'object') {
        return this.extractImageInternal(image[0]);
      }
    } 
    return null;
  }
  
  /**
   * Creates a span element with the given content
   * 
   * @param {string} content - The content for the span
   * @returns {HTMLElement} - The span element
   */
  makeAsSpan(content) {
    const span = document.createElement('span');
    // Use textContent for safe insertion
    span.textContent = content;
    span.className = 'item-details-text';
    return span;
  }
  
  /**
   * Adds an explanation to an item
   * 
   * @param {Object} item - The item data
   * @param {HTMLElement} contentDiv - The content div
   * @param {boolean} force - Whether to force adding the explanation
   * @returns {HTMLElement} - The details div
   */
  possiblyAddExplanation(item, contentDiv, force = false) {
    if (!item.explanation && !force) return null;
    
    const detailsDiv = document.createElement('div'); 
    contentDiv.appendChild(document.createElement('br'));
    const explSpan = this.makeAsSpan(item.explanation || '');
    explSpan.className = 'item-explanation';
    detailsDiv.appendChild(explSpan);
    contentDiv.appendChild(detailsDiv);
    return detailsDiv;
  }
  
  /**
   * Formats an object as HTML
   * 
   * @param {Object} obj - The object to format
   * @param {number} indent - The indentation level
   * @returns {string} - HTML representation of the object
   */
  formatObject(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    
    if (!obj || Object.keys(obj).length === 0) return '{}';
    
    const entries = Object.entries(obj).map(([key, value]) => {
      // Special handling for JSON-LD keywords (starting with @)
      const keySpan = key.startsWith('@') 
        ? `<span class="keyword">"${this.escapeHtml(key)}"</span>`
        : `<span class="key">"${this.escapeHtml(key)}"</span>`;
        
      return `${spaces}  ${keySpan}: ${this.formatValue(value, indent + 1)}`;
    });
    
    return `{\n${entries.join(',\n')}\n${spaces}}`;
  }
  
  /**
   * Formats a value as HTML
   * 
   * @param {*} value - The value to format
   * @param {number} indent - The indentation level
   * @returns {string} - HTML representation of the value
   */
  formatValue(value, indent) {
    const spaces = '  '.repeat(indent);
    
    if (value === null) {
      return `<span class="null">null</span>`;
    }
    
    switch (typeof value) {
      case 'string':
        // Special handling for URLs and IRIs in JSON-LD
        if (value.startsWith('http://') || value.startsWith('https://')) {
          return `<span class="string url">"${this.escapeHtml(value)}"</span>`;
        }
        return `<span class="string">"${this.escapeHtml(value)}"</span>`;
      case 'number':
        return `<span class="number">${value}</span>`;
      case 'boolean':
        return `<span class="boolean">${value}</span>`;
      case 'object':
        if (Array.isArray(value)) {
          if (value.length === 0) return '[]';
          const items = value.map(item => 
            `${spaces}  ${this.formatValue(item, indent + 1)}`
          ).join(',\n');
          return `[\n${items}\n${spaces}]`;
        }
        return this.formatObject(value, indent);
      default:
        return `<span class="unknown">${this.escapeHtml(String(value))}</span>`;
    }
  }
  
  /**
   * Wraps formatted HTML with CSS styles
   * 
   * @param {string} content - The formatted content
   * @returns {string} - The wrapped content with styles
   */
  wrapWithStyles(content) {
    return `<pre class="json-ld"><code>${content}</code></pre>
<style>
.json-ld {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  font-family: monospace;
  line-height: 1.5;
}
.json-ld .keyword { color: #e91e63; }
.json-ld .key { color: #2196f3; }
.json-ld .string { color: #4caf50; }
.json-ld .string.url { color: #9c27b0; }
.json-ld .number { color: #ff5722; }
.json-ld .boolean { color: #ff9800; }
.json-ld .null { color: #795548; }
.json-ld .unknown { color: #607d8b; }
</style>`;
  }
  
  /**
   * Escapes HTML special characters in a string
   * 
   * @param {string} str - The string to escape
   * @returns {string} - The escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Unescapes HTML entities in a string
   * 
   * @param {string} str - The string to unescape
   * @returns {string} - The unescaped string
   */
  htmlUnescape(str) {
    if (!str || typeof str !== 'string') return '';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<!DOCTYPE html><body>${str}`, 'text/html');
    return doc.body.textContent || '';
  }
}