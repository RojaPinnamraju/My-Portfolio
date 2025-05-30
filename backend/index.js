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
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
let contentCache = null;
let lastFetchTime = null;
let isFetching = false;
let fetchPromise = null;

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
  // Find the main description text with a more flexible pattern
  const match = text.match(/I am a passionate software engineer.*?(?=\n|$)/);
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
      timeout: 30000
    };

    console.log('Launching browser with options:', JSON.stringify(launchOptions, null, 2));
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set longer timeouts for better content loading
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // Enable request interception for debugging
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      // Block unnecessary resources to speed up loading
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
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
      timeout: 30000
    });

    // Wait for React to hydrate with a more robust check
    console.log('Waiting for React to hydrate...');
    try {
      // First wait for the root element
      await page.waitForSelector('#root', { timeout: 30000 });
      
      // Wait for the main content to be rendered
      await page.waitForSelector('div.App', { timeout: 30000 });
      
      // Wait for React to finish rendering
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let attempts = 0;
          const checkReady = () => {
            attempts++;
            const app = document.querySelector('div.App');
            if (app && app.textContent.length > 100) {
              resolve();
            } else if (attempts < 10) {
              setTimeout(checkReady, 1000);
            } else {
              resolve(); // Resolve anyway after 10 attempts
            }
          };
          checkReady();
        });
      });

      // Additional wait for dynamic content
      await page.waitForTimeout(5000);

      // Log the actual content for debugging
      const content = await page.evaluate(() => {
        const app = document.querySelector('div.App');
        return app ? app.innerHTML : 'No App element found';
      });
      console.log('App content length:', content.length);
      console.log('First 1000 chars of content:', content.substring(0, 1000));
    } catch (error) {
      console.log('Hydration check timed out, proceeding with available content:', error.message);
    }

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
      const delay = (4 - retries) * 1000;
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
  
  // If we have valid cached content, return it immediately
  if (contentCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    console.log('Returning cached content');
    return contentCache;
  }

  // If we're already fetching, return the existing promise
  if (isFetching && fetchPromise) {
    console.log('Fetch already in progress, returning existing promise');
    return fetchPromise;
  }

  // Start a new fetch
  isFetching = true;
  fetchPromise = (async () => {
    try {
      const url = portfolioUrl;
      console.log('Fetching from URL:', url);

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
      const aboutText = $('div.App').find('Text[fontSize="lg"]').first().text();
      console.log('About text extracted:', aboutText ? 'Yes' : 'No');

      // Extract skills
      const skills = [];
      const skillSet = new Set();
      $('div[class*="chakra-progress"]').each((i, el) => {
        const name = $(el).prev('div[class*="chakra-text"]').text().trim();
        const level = parseInt($(el).attr('aria-valuenow') || '0');
        if (name && !skillSet.has(name)) {
          skillSet.add(name);
          skills.push({
            name: cleanText(name),
            level: level
          });
        }
      });
      console.log('Skills extracted:', skills.length);

      // Extract experience
      const experiences = [];
      const experienceSet = new Set();
      $('section[data-section="experience"] div[class*="chakra-stack"]').each((i, el) => {
        const title = $(el).find('h2[class*="chakra-heading"]').text().trim();
        const company = $(el).find('div[class*="chakra-text"][class*="brand"]').text().trim();
        const period = $(el).find('div[class*="chakra-text"][class*="gray"]').text().trim();
        const description = [];
        $(el).find('div[class*="chakra-stack"] div[class*="chakra-text"]').each((j, desc) => {
          const text = $(desc).text().trim().replace(/^•\s*/, '');
          if (text) description.push(text);
        });
        
        if (title && company && !experienceSet.has(title + company)) {
          experienceSet.add(title + company);
          experiences.push({
            title: cleanText(title),
            company: cleanText(company),
            period: cleanText(period),
            description: description.map(d => cleanText(d))
          });
        }
      });
      console.log('Experiences extracted:', experiences.length);

      // Extract education
      const education = [];
      const educationSet = new Set();
      $('section[data-section="education"] div[class*="chakra-stack"]').each((i, el) => {
        const degree = $(el).find('h2[class*="chakra-heading"]').text().trim();
        const school = $(el).find('div[class*="chakra-text"][class*="brand"]').text().trim();
        const period = $(el).find('div[class*="chakra-text"][class*="gray"]').text().trim();
        const details = [];
        $(el).find('div[class*="chakra-stack"] div[class*="chakra-text"]').each((j, detail) => {
          const text = $(detail).text().trim().replace(/^•\s*/, '');
          if (text) details.push(text);
        });
        
        if (degree && school && !educationSet.has(degree + school)) {
          educationSet.add(degree + school);
          education.push({
            degree: cleanText(degree),
            school: cleanText(school),
            period: cleanText(period),
            details: details.map(d => cleanText(d))
          });
        }
      });
      console.log('Education extracted:', education.length);

      // Extract projects
      const projects = {};
      $('section[data-section="projects"] div[class*="chakra-stack"]').each((i, el) => {
        const title = $(el).find('h2[class*="chakra-heading"]').text().trim();
        const description = $(el).find('div[class*="chakra-text"]').first().text().trim();
        const technologies = [];
        $(el).find('div[class*="chakra-stack"] div[class*="chakra-text"]').each((j, tech) => {
          const techName = $(tech).text().trim();
          if (techName) technologies.push(techName);
        });
        const links = [];
        $(el).find('a[class*="chakra-link"]').each((j, link) => {
          const href = $(link).attr('href');
          if (href) links.push(href);
        });
        
        if (title && !projects[title]) {
          projects[title] = {
            name: cleanText(title),
            description: cleanText(description),
            technologies: technologies.map(t => cleanText(t)),
            links: links
          };
        }
      });
      console.log('Projects extracted:', Object.keys(projects).length);

      // Extract areas of expertise
      const expertise = [];
      $('section[data-section="expertise"] div[class*="chakra-stack"]').each((i, el) => {
        const title = $(el).find('div[class*="chakra-text"][class*="fontWeight"]').text().trim();
        const text = $(el).find('div[class*="chakra-text"][class*="gray"]').text().trim();
        if (title && text) {
          expertise.push({
            title: cleanText(title),
            description: cleanText(text)
          });
        }
      });
      console.log('Areas of expertise extracted:', expertise.length);

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

      // Log the extracted content for debugging
      console.log('Extracted content:', {
        skills: skills.map(s => s.name),
        experiences: experiences.map(e => ({ title: e.title, company: e.company })),
        education: education.map(e => ({ degree: e.degree, school: e.school })),
        projects: Object.keys(projects),
        expertise: expertise.map(e => e.title)
      });

      const content = {
        about: aboutText,
        experience: experiences,
        education: education,
        skills: skills,
        projects: projects,
        expertise: expertise,
        contact: contact
      };

      // Update cache
      contentCache = content;
      lastFetchTime = Date.now();
      console.log('Content extraction completed successfully');
      return content;
    } catch (error) {
      console.error('Error in fetchWebsiteContent:', error);
      throw new Error(`Failed to fetch content: ${error.message}`);
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
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

// Add warm-up endpoint
app.get('/warmup', async (req, res) => {
  console.log('Warm-up endpoint called');
  try {
    // Pre-fetch content
    await fetchWebsiteContent();
    res.json({ status: 'warmed up' });
  } catch (error) {
    console.error('Warm-up failed:', error);
    res.status(500).json({ error: 'Warm-up failed' });
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
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  console.log(`Fetching content from ${portfolioUrl}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Available endpoints:`);
  console.log(`- GET /`);
  console.log(`- GET /health`);
  console.log(`- GET /api/content`);
  console.log(`- GET /warmup`);
  
  // Pre-fetch content on startup
  try {
    console.log('Pre-fetching content on startup...');
    await fetchWebsiteContent();
    console.log('Initial content fetch successful');
  } catch (error) {
    console.error('Initial content fetch failed:', error);
  }
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