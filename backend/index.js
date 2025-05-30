const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const portfolioUrl = process.env.NODE_ENV === 'production' 
  ? 'https://rojapinnamraju-portfolio.netlify.app'
  : 'http://localhost:5173';

console.log('Configuration:', {
  port,
  portfolioUrl,
  nodeEnv: process.env.NODE_ENV || 'development'
});

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let contentCache = null;
let lastFetchTime = null;

// CORS configuration
const corsOptions = {
  origin: [
    'https://rojapinnamraju-portfolio.netlify.app',
    'http://localhost:5173',
    'http://localhost:8888',
    'http://localhost:3000',
    'https://rojapinnamraju-portfolio.netlify.app/.netlify/functions/chat'
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
  console.log('\n=== New Request ===');
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request origin:', req.headers.origin);
  console.log('Request host:', req.headers.host);
  console.log('Request body:', req.body);
  console.log('==================\n');
  next();
});

// Function to clean text content
const cleanText = (text) => {
  if (!text) return null;
  // Remove extra whitespace and normalize line endings
  return text.replace(/\s+/g, ' ').trim();
};

// Function to extract unique content
const extractUniqueContent = (text) => {
  if (!text) return [];
  // Split by common delimiters and clean up
  const parts = text.split(/[|•]/).map(part => cleanText(part)).filter(Boolean);
  // Remove duplicates while preserving order
  return [...new Set(parts)];
};

// Function to extract main content
const extractMainContent = (text) => {
  if (!text) return null;
  // Find the main description text
  const match = text.match(/I am a passionate software engineer.*?technologies\./);
  return match ? cleanText(match[0]) : null;
};

// Function to clear cache
function clearCache() {
  contentCache = null;
  lastFetchTime = null;
  console.log('Cache cleared');
}

// Function to fetch page content using Puppeteer
async function fetchPageContent(url, retries = 3) {
  console.log(`\n=== Fetching Content ===`);
  console.log(`URL: ${url}`);
  console.log(`Attempt: ${4 - retries}/3`);
  
  let browser;
  try {
    // Launch browser with appropriate options for Render environment
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials'
      ],
      headless: 'new',
      timeout: 15000 // 15 second launch timeout
    };

    console.log('Launching browser with options:', JSON.stringify(launchOptions, null, 2));
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set shorter timeouts for faster response
    page.setDefaultNavigationTimeout(12000);
    page.setDefaultTimeout(12000);

    // Enable request interception for debugging
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      console.log(`Intercepted request: ${request.url()} (${resourceType})`);
      // Block unnecessary resources to speed up loading
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        console.log(`Blocking resource: ${resourceType}`);
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to the page and wait for network idle
    console.log('Navigating to page...');
    await page.goto(url, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 12000 
    });

    // Wait for Vite's client to load
    console.log('Waiting for Vite client...');
    await page.waitForFunction(() => {
      return window.$RefreshReg$ !== undefined;
    }, { timeout: 5000 }).catch(() => {
      console.log('Vite client not found, continuing anyway');
    });

    // Wait for React to hydrate with a more lenient check
    console.log('Waiting for React to hydrate...');
    try {
      await page.waitForFunction(() => {
        const root = document.querySelector('#root');
        if (!root || !root.children.length) {
          console.log('Root element not found or empty');
          return false;
        }
        
        // Check if any content is loaded
        const hasContent = root.textContent.trim().length > 0;
        if (hasContent) {
          console.log('Found content in root element');
          return true;
        }
        
        // Check for specific sections as fallback
        const sections = [
          'about',
          'experience',
          'education',
          'skills',
          'projects'
        ];
        
        const foundSection = sections.some(section => {
          const element = document.querySelector(`section[data-section="${section}"]`);
          const hasContent = element && element.textContent.trim().length > 0;
          if (hasContent) {
            console.log(`Found content in section: ${section}`);
          }
          return hasContent;
        });

        if (!foundSection) {
          console.log('No sections found with content');
        }
        return foundSection;
      }, { timeout: 12000 });
    } catch (error) {
      console.log('Hydration check timed out, proceeding with available content');
    }

    // Wait for any dynamic content
    console.log('Waiting for dynamic content...');
    await page.waitForTimeout(2000);

    // Get the page content
    const html = await page.content();
    console.log('Content fetched successfully, length:', html.length);
    console.log('=== Content Fetch Complete ===\n');

    await browser.close();
    return html;
  } catch (error) {
    console.error('Error fetching page content:', error);
    if (browser) {
      await browser.close();
    }
    
    if (retries > 1) {
      const delay = (4 - retries) * 2000; // Exponential backoff
      console.log(`Retrying in ${delay}ms... (${retries - 1} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchPageContent(url, retries - 1);
    }
    throw new Error(`Failed to fetch content after 3 attempts: ${error.message}`);
  }
}

// Function to fetch website content with caching
async function fetchWebsiteContent() {
  console.log('Starting website content fetch...');
  const url = portfolioUrl;  // Use base URL without any path
  console.log('Fetching from URL:', url);

  try {
    const html = await fetchPageContent(url);
    const $ = cheerio.load(html);
    
    // Log the HTML structure for debugging
    console.log('HTML structure:', {
      title: $('title').text(),
      bodyLength: $('body').text().length,
      sections: $('section').length,
      metaDescription: $('meta[name="description"]').attr('content'),
      links: $('a').length,
      scripts: $('script').length
    });

    // Extract about section
    const aboutText = extractMainContent($('div.App').text());
    console.log('About text extracted:', aboutText ? 'Yes' : 'No');

    // Extract skills
    const skills = [];
    const skillSet = new Set();
    $('div.App').find('div').each((i, el) => {
      const text = $(el).text().trim();
      if (text && ['Clean Code', 'Web Development', 'AI/ML'].includes(text) && !skillSet.has(text)) {
        skillSet.add(text);
        skills.push({
          name: cleanText(text),
          level: 90 // Default level for main skills
        });
      }
    });
    console.log('Skills extracted:', skills.length);

    // Extract experience
    const experiences = [];
    const experienceSet = new Set();
    $('div.App').find('div').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.includes('Software Engineer') && !experienceSet.has(text)) {
        experienceSet.add(text);
        const description = extractUniqueContent(text);
        if (description.length > 0) {
          experiences.push({
            title: 'Software Engineer',
            company: 'Current',
            period: 'Present',
            description: [extractMainContent(text)].filter(Boolean)
          });
        }
      }
    });
    console.log('Experiences extracted:', experiences.length);

    // Extract education
    const education = [];
    const educationSet = new Set();
    $('div.App').find('div').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.includes('AI Enthusiast') && !educationSet.has(text)) {
        educationSet.add(text);
        const details = extractUniqueContent(text);
        if (details.length > 0) {
          education.push({
            degree: 'Software Engineering',
            school: 'Self-taught',
            period: 'Ongoing',
            details: [extractMainContent(text)].filter(Boolean)
          });
        }
      }
    });
    console.log('Education extracted:', education.length);

    // Extract projects
    const projects = {};
    $('div.App').find('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('github.com')) {
        const title = $(el).text().trim() || 'GitHub Project';
        if (!projects[title]) {
          projects[title] = {
            name: title,
            description: 'GitHub Repository',
            technologies: ['Various'],
            links: [href]
          };
        }
      }
    });
    console.log('Projects extracted:', Object.keys(projects).length);

    // Extract contact
    const contact = {};
    $('div.App').find('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.includes('github.com')) {
          contact['GitHub'] = href;
        } else if (href.includes('linkedin.com')) {
          contact['LinkedIn'] = href;
        }
      }
    });
    console.log('Contact info extracted:', Object.keys(contact).length);

    const content = {
      about: aboutText,
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
    // Check if we have valid cached content
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

    // If we have cached content, return it even if expired
    if (contentCache) {
      console.log('Returning expired cached content due to error');
      return res.json(contentCache);
    }

    // Return a minimal response if no cache is available
    res.status(200).json({
      about: 'Software Engineer and AI enthusiast',
      experience: [],
      education: [],
      skills: [],
      projects: {},
      contact: {}
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