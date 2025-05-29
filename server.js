import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { render } from './dist/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes
app.get('*', (req, res) => {
  const html = render(req.url);
  res.send(html);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 