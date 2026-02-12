/**
 * ScheduleBox Booking Widget Loader
 *
 * Usage:
 *   <script src="https://app.schedulebox.cz/widget/embed.js"></script>
 *   <schedulebox-widget data-company="my-salon" data-theme="light"></schedulebox-widget>
 *
 * Attributes:
 *   data-company (required): Company slug
 *   data-theme (optional): 'light' or 'dark' (default: 'light')
 *   data-locale (optional): 'cs', 'sk', 'en' (default: 'cs')
 *   data-width (optional): CSS width value (default: '100%')
 *   data-height (optional): Minimum height in pixels (default: '600px')
 *   data-base-url (optional): Base URL for development (default: auto-detected from script src)
 */

(function() {
  'use strict';

  // Define ScheduleBoxWidget custom element
  class ScheduleBoxWidget extends HTMLElement {
    constructor() {
      super();
      this.iframe = null;
      this.messageListener = null;
    }

    connectedCallback() {
      // Read attributes
      const companySlug = this.getAttribute('data-company');
      const theme = this.getAttribute('data-theme') || 'light';
      const locale = this.getAttribute('data-locale') || 'cs';
      const width = this.getAttribute('data-width') || '100%';
      const height = this.getAttribute('data-height') || '600px';

      // Validate required company slug
      if (!companySlug) {
        this.showError('Missing required attribute: data-company');
        return;
      }

      // Detect base URL (development vs production)
      const baseUrl = this.getBaseUrl();

      // Create shadow DOM for style isolation
      const shadow = this.attachShadow({ mode: 'open' });

      // Add loading spinner styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          width: ${width};
        }
        .widget-container {
          position: relative;
          width: 100%;
          min-height: ${height};
        }
        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: ${height};
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        iframe {
          width: 100%;
          min-height: ${height};
          border: none;
          border-radius: 8px;
          display: block;
        }
        .error-message {
          padding: 20px;
          background: #fee;
          color: #c00;
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
        }
      `;
      shadow.appendChild(style);

      // Create container
      const container = document.createElement('div');
      container.className = 'widget-container';

      // Show loading spinner
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      spinner.innerHTML = '<div class="spinner"></div>';
      container.appendChild(spinner);

      // Create iframe
      const iframe = document.createElement('iframe');
      const iframeSrc = `${baseUrl}/embed/${companySlug}?theme=${encodeURIComponent(theme)}&locale=${encodeURIComponent(locale)}`;
      iframe.src = iframeSrc;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      iframe.setAttribute('allow', 'payment');
      iframe.title = 'ScheduleBox Booking Widget';

      // Hide spinner when iframe loads
      iframe.onload = function() {
        spinner.style.display = 'none';
      };

      container.appendChild(iframe);
      shadow.appendChild(container);

      this.iframe = iframe;

      // Set up PostMessage listener for resize and events
      this.messageListener = this.handleMessage.bind(this);
      window.addEventListener('message', this.messageListener);
    }

    disconnectedCallback() {
      // Clean up message listener
      if (this.messageListener) {
        window.removeEventListener('message', this.messageListener);
        this.messageListener = null;
      }
    }

    handleMessage(event) {
      // Validate origin
      const allowedOrigins = this.getAllowedOrigins();
      if (!allowedOrigins.includes(event.origin)) {
        return; // Ignore messages from unknown origins
      }

      // Validate iframe source
      if (this.iframe && event.source !== this.iframe.contentWindow) {
        return; // Ignore messages not from our iframe
      }

      const data = event.data;

      if (!data || typeof data !== 'object' || !data.type) {
        return; // Invalid message format
      }

      switch (data.type) {
        case 'RESIZE':
          if (typeof data.height === 'number' && data.height > 0) {
            this.iframe.style.height = data.height + 'px';
          }
          break;

        case 'SERVICE_SELECTED':
          // Dispatch custom event for external listeners
          this.dispatchEvent(new CustomEvent('service-selected', {
            detail: data.service,
            bubbles: true,
            composed: true
          }));
          break;

        case 'ERROR':
          // Dispatch error event
          this.dispatchEvent(new CustomEvent('widget-error', {
            detail: data.error,
            bubbles: true,
            composed: true
          }));
          break;
      }
    }

    getBaseUrl() {
      // Check for explicit base URL attribute (for development)
      const explicitBaseUrl = this.getAttribute('data-base-url');
      if (explicitBaseUrl) {
        return explicitBaseUrl.replace(/\/$/, ''); // Remove trailing slash
      }

      // Auto-detect from script tag
      const scripts = document.querySelectorAll('script[src*="embed.js"]');
      for (let script of scripts) {
        const src = script.src;
        if (src) {
          // Extract base URL from script src (e.g., https://app.schedulebox.cz/widget/embed.js -> https://app.schedulebox.cz)
          const url = new URL(src);
          return url.origin;
        }
      }

      // Fallback to production URL
      return 'https://app.schedulebox.cz';
    }

    getAllowedOrigins() {
      const baseUrl = this.getBaseUrl();
      const url = new URL(baseUrl);

      // Allow both http and https for development
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3001'
        ];
      }

      // Production: allow only the base URL origin
      return [url.origin];
    }

    showError(message) {
      const shadow = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
        .error-message {
          padding: 20px;
          background: #fee;
          color: #c00;
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
        }
      `;
      shadow.appendChild(style);

      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = 'ScheduleBox Widget Error: ' + message;
      shadow.appendChild(errorDiv);
    }
  }

  // Register custom element
  if (!customElements.get('schedulebox-widget')) {
    customElements.define('schedulebox-widget', ScheduleBoxWidget);
  }
})();
