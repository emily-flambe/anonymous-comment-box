#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const staticDir = path.join(__dirname, 'src', 'static');
const outputFile = path.join(__dirname, 'src', 'lib', 'static.ts');

// Read static files
const htmlContent = fs.readFileSync(path.join(staticDir, 'index.html'), 'utf-8');
const cssContent = fs.readFileSync(path.join(staticDir, 'styles.css'), 'utf-8');
const jsContent = fs.readFileSync(path.join(staticDir, 'script.js'), 'utf-8');

// Escape template literals
const escapeTemplate = (str) => str.replace(/`/g, '\\`').replace(/\${/g, '\\${');

// Generate the static.ts file
const staticTsContent = `// Serve static files from the src/static directory
const staticFiles: Record<string, string> = {
  '/': '/index.html',
  '/index.html': '/index.html',
  '/styles.css': '/styles.css',
  '/script.js': '/script.js',
};

// Embed static assets as strings
const htmlContent = \`${escapeTemplate(htmlContent)}\`;

const cssContent = \`${escapeTemplate(cssContent)}\`;

const jsContent = \`${escapeTemplate(jsContent)}\`;

export async function handleStaticAssets(request: Request, url: URL, env?: any): Promise<Response> {
  const path = staticFiles[url.pathname] || url.pathname;
  
  try {
    // Check if ASSETS is available (wrangler dev with assets configured)
    if (env?.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }
      } catch (assetsError) {
        console.log('Assets fetch failed:', assetsError);
      }
    }
    
    // Fallback to embedded content
    if (path === '/index.html' || path === '/') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    if (path === '/styles.css') {
      return new Response(cssContent, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }
    
    if (path === '/script.js') {
      return new Response(jsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.error('Static asset error:', error);
    return new Response('Not Found', { status: 404 });
  }
}
`;

// Write the file
fs.writeFileSync(outputFile, staticTsContent, 'utf-8');
console.log('✅ Static assets embedded successfully!');