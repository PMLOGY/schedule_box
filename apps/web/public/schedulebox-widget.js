/**
 * ScheduleBox Embeddable Widget - Web Component
 *
 * Usage:
 *   <script src="https://app.schedulebox.cz/schedulebox-widget.js"></script>
 *   <schedulebox-widget slug="demo-salon" locale="cs" height="700px"></schedulebox-widget>
 *
 * Attributes:
 *   - slug (required): Company slug
 *   - theme: "light" (default) or "dark"
 *   - locale: "cs" (default), "en", or "sk"
 *   - height: CSS height value (default "600px")
 *   - base-url: Base URL override (default "https://app.schedulebox.cz")
 */
(function () {
  'use strict';

  if (customElements.get('schedulebox-widget')) return;

  class ScheduleBoxWidget extends HTMLElement {
    static get observedAttributes() {
      return ['slug', 'theme', 'locale', 'height', 'base-url'];
    }

    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._iframe = null;
      this._loader = null;
    }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (this._iframe && name === 'slug') {
        this._updateIframeSrc();
      } else if (this._iframe) {
        this._updateIframeSrc();
      }
    }

    _getSlug() {
      return this.getAttribute('slug') || '';
    }

    _getTheme() {
      return this.getAttribute('theme') || 'light';
    }

    _getLocale() {
      return this.getAttribute('locale') || 'cs';
    }

    _getHeight() {
      return this.getAttribute('height') || '600px';
    }

    _getBaseUrl() {
      return this.getAttribute('base-url') || 'https://app.schedulebox.cz';
    }

    _buildSrc() {
      var slug = this._getSlug();
      if (!slug) return '';
      var baseUrl = this._getBaseUrl();
      var theme = this._getTheme();
      var locale = this._getLocale();
      var parentOrigin = encodeURIComponent(window.location.origin);
      return (
        baseUrl +
        '/embed/' +
        encodeURIComponent(slug) +
        '?theme=' +
        encodeURIComponent(theme) +
        '&locale=' +
        encodeURIComponent(locale) +
        '&parent_origin=' +
        parentOrigin
      );
    }

    _render() {
      var slug = this._getSlug();
      var height = this._getHeight();

      // Styles
      var style = document.createElement('style');
      style.textContent =
        ':host { display: block; width: 100%; }' +
        '.sb-widget-container { position: relative; width: 100%; height: ' +
        height +
        '; }' +
        '.sb-widget-iframe { width: 100%; height: 100%; border: none; border-radius: 12px; }' +
        '.sb-widget-loader { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 12px; transition: opacity 0.3s ease; }' +
        '.sb-widget-loader.hidden { opacity: 0; pointer-events: none; }' +
        '.sb-widget-skeleton { width: 80%; max-width: 400px; }' +
        '.sb-widget-skeleton-line { height: 16px; background: #e5e7eb; border-radius: 4px; margin-bottom: 12px; animation: sb-pulse 1.5s ease-in-out infinite; }' +
        '.sb-widget-skeleton-line:nth-child(1) { width: 60%; }' +
        '.sb-widget-skeleton-line:nth-child(2) { width: 80%; }' +
        '.sb-widget-skeleton-line:nth-child(3) { width: 70%; }' +
        '.sb-widget-skeleton-line:nth-child(4) { width: 50%; }' +
        '@keyframes sb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }' +
        '.sb-widget-error { text-align: center; color: #6b7280; font-family: system-ui, sans-serif; font-size: 14px; padding: 24px; }';
      this._shadow.appendChild(style);

      // Container
      var container = document.createElement('div');
      container.className = 'sb-widget-container';

      if (!slug) {
        var error = document.createElement('div');
        error.className = 'sb-widget-error';
        error.textContent = 'ScheduleBox Widget: Missing "slug" attribute.';
        container.appendChild(error);
        this._shadow.appendChild(container);
        return;
      }

      // Loading skeleton
      this._loader = document.createElement('div');
      this._loader.className = 'sb-widget-loader';
      var skeleton = document.createElement('div');
      skeleton.className = 'sb-widget-skeleton';
      for (var i = 0; i < 4; i++) {
        var line = document.createElement('div');
        line.className = 'sb-widget-skeleton-line';
        skeleton.appendChild(line);
      }
      this._loader.appendChild(skeleton);
      container.appendChild(this._loader);

      // Iframe
      this._iframe = document.createElement('iframe');
      this._iframe.className = 'sb-widget-iframe';
      this._iframe.setAttribute('title', 'ScheduleBox Booking Widget');
      this._iframe.setAttribute('loading', 'lazy');
      this._iframe.setAttribute(
        'allow',
        'payment; clipboard-write'
      );
      this._iframe.src = this._buildSrc();

      var self = this;
      this._iframe.addEventListener('load', function () {
        if (self._loader) {
          self._loader.classList.add('hidden');
        }
      });

      container.appendChild(this._iframe);
      this._shadow.appendChild(container);
    }

    _updateIframeSrc() {
      if (!this._iframe) return;
      var src = this._buildSrc();
      if (src && this._iframe.src !== src) {
        if (this._loader) {
          this._loader.classList.remove('hidden');
        }
        this._iframe.src = src;
      }
    }
  }

  customElements.define('schedulebox-widget', ScheduleBoxWidget);
})();
