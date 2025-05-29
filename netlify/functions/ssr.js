const { createServer } = require('vite');
const { resolve } = require('path');
const fs = require('fs');

exports.handler = async (event, context) => {
  try {
    // Create Vite server
    const server = await createServer({
      root: resolve(process.cwd(), 'dist'),
      server: {
        middlewareMode: true,
      },
    });

    // Get the URL path
    const url = event.path;
    console.log('Rendering URL:', url);

    // Read the index.html from the dist directory
    const indexPath = resolve(process.cwd(), 'dist', 'index.html');
    console.log('Reading index.html from:', indexPath);
    
    if (!fs.existsSync(indexPath)) {
      console.error('index.html not found at:', indexPath);
      return {
        statusCode: 500,
        body: 'Build files not found. Please ensure the site is built correctly.',
      };
    }

    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    console.log('Successfully read index.html');

    // Render the app
    const { html } = await server.transformIndexHtml(url, indexHtml);
    console.log('Successfully transformed HTML');
    
    // Return the rendered HTML
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: html,
    };
  } catch (error) {
    console.error('SSR Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      path: error.path,
      stack: error.stack
    });
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
}; 