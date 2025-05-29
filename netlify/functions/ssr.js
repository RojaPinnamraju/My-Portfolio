const { createServer } = require('vite');
const { resolve } = require('path');
const fs = require('fs');

exports.handler = async (event, context) => {
  try {
    // Create Vite server
    const server = await createServer({
      root: process.cwd(),
      server: {
        middlewareMode: true,
      },
    });

    // Get the URL path
    const url = event.path;
    console.log('Rendering URL:', url);

    // Render the app
    const { html } = await server.transformIndexHtml(url, fs.readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8'));
    
    // Return the rendered HTML
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: html,
    };
  } catch (error) {
    console.error('SSR Error:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
}; 