const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let contentCache = null;
let lastFetchTime = null;

// CORS configuration
const corsOptions = {
  origin: ['https://rojapinnamraju-portfolio.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  next();
});

// Function to clean text content
const cleanText = (text) => {
  if (!text) return null;
  return text.replace(/\s+/g, ' ').trim();
};

// Function to extract section content
const extractSection = ($, sectionName) => {
  const selectors = [
    `[data-section="${sectionName}"]`,
    `[data-testid="${sectionName}"]`,
    `[role="${sectionName}"]`,
    `[aria-label="${sectionName}"]`,
    `.${sectionName}`,
    `#${sectionName}`
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      console.log(`Found element with selector: ${selector}`);
      return cleanText(element.text());
    }
  }
  console.log(`No element found for section: ${sectionName}`);
  return null;
};

// Function to fetch page content with timeout
async function fetchPageContent(url) {
  try {
    console.log(`Fetching content from ${url}...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    console.log('Content fetched successfully');

    // Load HTML into cheerio
    const $ = cheerio.load(html);
    
    // Extract content based on page type
    if (url.includes('/about')) {
      return {
        about: extractSection($, 'about'),
        experience: extractSection($, 'experience'),
        education: extractSection($, 'education'),
        skills: extractSection($, 'skills')
      };
    } else if (url.includes('/projects')) {
      const projects = {};
      $('[data-section="projects"] .project, [data-testid="projects"] .project').each((i, el) => {
        const title = $(el).find('.project-title').text();
        const description = $(el).find('.project-description').text();
        if (title) {
          projects[cleanText(title)] = cleanText(description);
        }
      });
      return projects;
    } else if (url.includes('/contact')) {
      const contact = {};
      $('[data-section="contact"] .contact-item, [data-testid="contact"] .contact-item').each((i, el) => {
        const type = $(el).find('.contact-type').text();
        const value = $(el).find('.contact-value').text();
        if (type) {
          contact[cleanText(type)] = cleanText(value);
        }
      });
      return contact;
    }

    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Timeout while fetching ${url}`);
      return null;
    }
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Function to fetch website content with caching
async function fetchWebsiteContent() {
  // Check if we have valid cached content
  if (contentCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    console.log('Returning cached content');
    return contentCache;
  }

  console.log('Starting content fetch...');
  const baseUrl = 'https://rojapinnamraju-portfolio.netlify.app';
  console.log('Using base URL:', baseUrl);
  
  try {
    // Fetch about page content
    console.log('Fetching about page content...');
    const aboutContent = await fetchPageContent(`${baseUrl}/about`);
    console.log('About page content:', aboutContent);

    // Fetch projects page content
    console.log('Fetching projects page content...');
    const projectsContent = await fetchPageContent(`${baseUrl}/projects`);
    console.log('Projects page content:', projectsContent);

    // Fetch contact page content
    console.log('Fetching contact page content...');
    const contactContent = await fetchPageContent(`${baseUrl}/contact`);
    console.log('Contact page content:', contactContent);

    const content = {
      about: aboutContent?.about || 'No information available',
      experience: aboutContent?.experience || 'No information available',
      education: aboutContent?.education || 'No information available',
      skills: aboutContent?.skills || 'No information available',
      projects: projectsContent || {},
      contact: contactContent || {}
    };

    // Update cache
    contentCache = content;
    lastFetchTime = Date.now();

    console.log('Final combined content:', content);
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    // Return cached content if available, otherwise return default content
    if (contentCache) {
      console.log('Returning stale cached content due to error');
      return contentCache;
    }
    return {
      about: 'No information available',
      experience: 'No information available',
      education: 'No information available',
      skills: 'No information available',
      projects: {},
      contact: {}
    };
  }
}

// Root endpoint
app.get('/', (req, res) => {
  console.log('Root endpoint requested');
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    message: 'Portfolio content extraction service is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      content: '/api/content'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'portfolio-backend'
  });
});

// API endpoint to fetch content
app.get('/api/content', async (req, res) => {
  try {
    console.log('Received request for content');
    res.setHeader('Content-Type', 'application/json');
    const content = await fetchWebsiteContent();
    console.log('Sending response:', content);
    res.json(content);
  } catch (error) {
    console.error('Error in /api/content endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch content',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Available endpoints:`);
  console.log(`- GET /`);
  console.log(`- GET /health`);
  console.log(`- GET /api/content`);
  
  // Log all registered routes
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  console.log('Registered routes:', routes);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});