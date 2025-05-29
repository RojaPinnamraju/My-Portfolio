const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
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

// Function to fetch page content
async function fetchPageContent(url) {
  try {
    console.log(`Fetching content from ${url}...`);
    const response = await fetch(url);
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
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Function to fetch website content
async function fetchWebsiteContent() {
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

    console.log('Final combined content:', content);
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
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
const server = app.listen(port, '0.0.0.0', () => {
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