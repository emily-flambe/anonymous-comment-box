// Serve static files from the src/static directory
const staticFiles: Record<string, string> = {
  '/': '/index.html',
  '/index.html': '/index.html',
  '/styles.css': '/styles.css',
  '/script.js': '/script.js',
};

export async function handleStaticAssets(request: Request, url: URL): Promise<Response> {
  const path = staticFiles[url.pathname] || url.pathname;
  
  try {
    // In production, these would be served from KV or R2
    // For development, we'll import them as modules
    if (path === '/index.html' || path === '/') {
      const html = await import('../static/index.html?raw');
      return new Response(html.default, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    if (path === '/styles.css') {
      const css = await import('../static/styles.css?raw');
      return new Response(css.default, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }
    
    if (path === '/script.js') {
      const js = await import('../static/script.js?raw');
      return new Response(js.default, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.error('Static asset error:', error);
    return new Response('Not Found', { status: 404 });
  }
}