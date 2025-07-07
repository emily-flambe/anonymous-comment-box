import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleStaticAssets } from '../../../src/lib/static';

// Mock the static file imports
vi.mock('../../../src/static/index.html?raw', () => ({
  default: '<!DOCTYPE html><html><head><title>Test App</title></head><body><h1>Anonymous Comment Box</h1></body></html>',
}));

vi.mock('../../../src/static/styles.css?raw', () => ({
  default: 'body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }',
}));

vi.mock('../../../src/static/script.js?raw', () => ({
  default: 'console.log("App initialized"); function submitForm() { /* implementation */ }',
}));

describe('Static Assets Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HTML Routes', () => {
    it('should serve index.html for root path', async () => {
      const request = new Request('http://localhost/', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      
      const content = await response.text();
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('Anonymous Comment Box');
    });

    it('should serve index.html for /index.html', async () => {
      const request = new Request('http://localhost/index.html', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      
      const content = await response.text();
      expect(content).toContain('Anonymous Comment Box');
    });

    it('should serve index.html for unknown paths (SPA fallback)', async () => {
      const request = new Request('http://localhost/unknown/path', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      
      const content = await response.text();
      expect(content).toContain('Anonymous Comment Box');
    });
  });

  describe('CSS Routes', () => {
    it('should serve CSS with correct content type', async () => {
      const request = new Request('http://localhost/styles.css', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
      
      const content = await response.text();
      expect(content).toContain('font-family: Arial');
    });

    it('should handle CSS with query parameters', async () => {
      const request = new Request('http://localhost/styles.css?v=123', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    });
  });

  describe('JavaScript Routes', () => {
    it('should serve JavaScript with correct content type', async () => {
      const request = new Request('http://localhost/script.js', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/javascript; charset=utf-8');
      
      const content = await response.text();
      expect(content).toContain('App initialized');
      expect(content).toContain('function submitForm');
    });

    it('should handle JS with query parameters', async () => {
      const request = new Request('http://localhost/script.js?version=456', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/javascript; charset=utf-8');
    });
  });

  describe('Caching Headers', () => {
    it('should set cache headers for static assets', async () => {
      const request = new Request('http://localhost/styles.css', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
      expect(response.headers.get('ETag')).toBeTruthy();
    });

    it('should set different cache headers for HTML', async () => {
      const request = new Request('http://localhost/', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('ETag')).toBeTruthy();
    });

    it('should handle conditional requests with If-None-Match', async () => {
      // First request to get ETag
      const request1 = new Request('http://localhost/styles.css', { method: 'GET' });
      const url1 = new URL(request1.url);
      const response1 = await handleStaticAssets(request1, url1);
      const etag = response1.headers.get('ETag');

      // Second request with If-None-Match
      const request2 = new Request('http://localhost/styles.css', {
        method: 'GET',
        headers: { 'If-None-Match': etag || '' },
      });
      const url2 = new URL(request2.url);
      const response2 = await handleStaticAssets(request2, url2);

      expect(response2.status).toBe(304);
      expect(response2.headers.get('ETag')).toBe(etag);
    });

    it('should return full content for non-matching ETags', async () => {
      const request = new Request('http://localhost/styles.css', {
        method: 'GET',
        headers: { 'If-None-Match': '"different-etag"' },
      });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      const content = await response.text();
      expect(content).toContain('font-family: Arial');
    });
  });

  describe('HTTP Methods', () => {
    it('should handle HEAD requests', async () => {
      const request = new Request('http://localhost/styles.css', { method: 'HEAD' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
      expect(response.headers.get('Content-Length')).toBeTruthy();
      
      const content = await response.text();
      expect(content).toBe(''); // HEAD requests should have empty body
    });

    it('should return 405 for unsupported methods', async () => {
      const request = new Request('http://localhost/styles.css', { method: 'POST' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET, HEAD');
      
      const data = await response.json();
      expect(data).toEqual({ error: 'Method not allowed' });
    });

    it('should return 405 for PUT requests', async () => {
      const request = new Request('http://localhost/', { method: 'PUT' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(405);
    });

    it('should return 405 for DELETE requests', async () => {
      const request = new Request('http://localhost/script.js', { method: 'DELETE' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(405);
    });
  });

  describe('Content Security', () => {
    it('should set security headers for HTML', async () => {
      const request = new Request('http://localhost/', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should set security headers for CSS', async () => {
      const request = new Request('http://localhost/styles.css', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should set security headers for JavaScript', async () => {
      const request = new Request('http://localhost/script.js', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Content Length', () => {
    it('should set correct content length for CSS', async () => {
      const request = new Request('http://localhost/styles.css', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      const content = await response.text();
      const contentLength = response.headers.get('Content-Length');
      
      expect(contentLength).toBe(content.length.toString());
    });

    it('should set correct content length for JavaScript', async () => {
      const request = new Request('http://localhost/script.js', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      const content = await response.text();
      const contentLength = response.headers.get('Content-Length');
      
      expect(contentLength).toBe(content.length.toString());
    });

    it('should set correct content length for HTML', async () => {
      const request = new Request('http://localhost/', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      const content = await response.text();
      const contentLength = response.headers.get('Content-Length');
      
      expect(contentLength).toBe(content.length.toString());
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with multiple slashes', async () => {
      const request = new Request('http://localhost///', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    });

    it('should handle paths with trailing slashes', async () => {
      const request = new Request('http://localhost/script.js/', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      // Should fallback to index.html for unknown paths
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    });

    it('should handle case-sensitive paths', async () => {
      const request = new Request('http://localhost/STYLES.CSS', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      // Should fallback to index.html for unknown paths
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    });

    it('should handle encoded paths', async () => {
      const request = new Request('http://localhost/script%2Ejs', { method: 'GET' });
      const url = new URL(request.url);

      const response = await handleStaticAssets(request, url);

      // Should fallback to index.html for unknown paths
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    });
  });
});