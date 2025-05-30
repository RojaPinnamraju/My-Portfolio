const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const portfolioUrl = process.env.NODE_ENV === 'production' 
  ? 'https://my-portfolio-olw8.netlify.app'
  : (process.env.PORTFOLIO_URL || 'http://localhost:5173');

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let contentCache = null;
let lastFetchTime = null;

// CORS configuration
const corsOptions = {
  origin: [
    'https://my-portfolio-olw8.netlify.app',
    'http://localhost:5173',
    'http://localhost:8888',
    'https://my-portfolio-olw8.netlify.app/.netlify/functions/chat'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  console.log('Request origin:', req.headers.origin);
  console.log('Request host:', req.headers.host);
  next();
});

// Function to clean text content
const cleanText = (text) => {
  if (!text) return null;
  return text.replace(/\s+/g, ' ').trim();
};

// Function to fetch page content
async function fetchPageContent(url, retries = 3) {
  console.log(`Fetching content from ${url} (attempt ${4 - retries}/3)`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('Content fetched successfully');
    return html;
  } catch (error) {
    console.error('Error fetching page content:', error);
    if (retries > 1) {
      console.log(`Retrying... (${retries - 1} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchPageContent(url, retries - 1);
    }
    throw new Error(`Failed to fetch content after 3 attempts: ${error.message}`);
  }
}

// Function to fetch website content with caching
async function fetchWebsiteContent() {
  console.log('Starting website content fetch...');
  const url = `${portfolioUrl}`;  // Remove the /#/about fragment
  console.log('Fetching from URL:', url);

  try {
    const html = await fetchPageContent(url);
    const $ = cheerio.load(html);
    
    // Extract about section
    const aboutSection = $('section[data-section="about"]');
    const aboutText = aboutSection.find('Text, [class*="chakra-text"]').text();
    console.log('About text extracted:', aboutText ? 'Yes' : 'No');

    // Extract skills
    const skills = [];
    $('.skill, [class*="skill"], [class*="Skill"], [class*="chakra-stack"]').each((i, el) => {
      const name = $(el).find('Text, [class*="chakra-text"], [class*="chakra-heading"]').text();
      const level = $(el).find('progress, [class*="chakra-progress"]').attr('value') || 0;
      if (name) {
        skills.push({
          name: cleanText(name),
          level: parseInt(level) || 0
        });
      }
    });
    console.log('Skills extracted:', skills.length);

    // Extract experience
    const experiences = [];
    $('.experience, [class*="experience"], [class*="Experience"]').each((i, el) => {
      const title = $(el).find('.title, [class*="title"]').text();
      const company = $(el).find('.company, [class*="company"]').text();
      const period = $(el).find('.period, [class*="period"]').text();
      const description = [];
      $(el).find('.description li, .description p, [class*="description"] li, [class*="description"] p').each((j, item) => {
        const text = $(item).text().trim();
        if (text) {
          description.push(cleanText(text.replace(/^•\s*/, '')));
        }
      });
      
      if (title) {
        experiences.push({
          title: cleanText(title),
          company: cleanText(company),
          period: cleanText(period),
          description: description
        });
      }
    });
    console.log('Experiences extracted:', experiences.length);

    // Extract education
    const education = [];
    $('.education, [class*="education"], [class*="Education"], [class*="chakra-stack"]').each((i, el) => {
      const degree = $(el).find('.degree, [class*="degree"]').text();
      const school = $(el).find('.school, [class*="school"]').text();
      const period = $(el).find('.period, [class*="period"]').text();
      const details = [];
      $(el).find('.details li, .details p, [class*="details"] li, [class*="details"] p').each((j, item) => {
        const text = $(item).text().trim();
        if (text) {
          details.push(cleanText(text.replace(/^•\s*/, '')));
        }
      });
      
      if (degree) {
        education.push({
          degree: cleanText(degree),
          school: cleanText(school),
          period: cleanText(period),
          details: details
        });
      }
    });
    console.log('Education extracted:', education.length);

    // Extract projects
    const projects = {};
    $('.project, [class*="project"], [class*="chakra-stack"]').each((i, el) => {
      const title = $(el).find('[class*="chakra-heading"], [class*="chakra-text"][font-weight="600"]').text();
      const description = $(el).find('[class*="chakra-text"]').text();
      if (title) {
        projects[cleanText(title)] = cleanText(description);
      }
    });
    console.log('Projects extracted:', Object.keys(projects).length);

    // Extract contact
    const contact = {};
    $('.contact-item, [class*="contact"], [class*="chakra-stack"]').each((i, el) => {
      const type = $(el).find('[class*="chakra-text"][font-weight="600"]').text();
      const value = $(el).find('[class*="chakra-text"]').text();
      if (type) {
        contact[cleanText(type)] = cleanText(value);
      }
    });
    console.log('Contact info extracted:', Object.keys(contact).length);

    const content = {
      about: cleanText(aboutText),
      experience: experiences,
      education: education,
      skills: skills,
      projects: projects,
      contact: contact
    };

    console.log('Content extraction completed successfully');
    return content;
  } catch (error) {
    console.error('Error in fetchWebsiteContent:', error);
    throw new Error(`Failed to fetch content: ${error.message}`);
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
    // Check if we have cached content that's still valid
    if (contentCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      console.log('Returning cached content');
      return res.json(contentCache);
    }

    console.log(`Fetching content from ${portfolioUrl}`);
    const content = await fetchWebsiteContent();
    
    // Update cache
    contentCache = content;
    lastFetchTime = Date.now();
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch content',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
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
  console.log(`Fetching content from ${portfolioUrl}`);
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