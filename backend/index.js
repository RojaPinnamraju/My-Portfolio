const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
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

// Function to fetch page content
async function fetchPageContent(browser, url) {
  const page = await browser.newPage();
  let content = null;
  
  try {
    console.log(`Navigating to ${url}...`);
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    console.log('Page loaded successfully');
    
    // Wait for React to render
    console.log('Waiting for React root element...');
    await page.waitForSelector('#root', { 
      state: 'attached',
      timeout: 30000 
    });
    console.log('React root element found');
    
    // Additional wait for dynamic content
    console.log('Waiting for dynamic content...');
    await page.waitForTimeout(2000);
    console.log('Dynamic content wait complete');

    // Extract content using multiple strategies
    console.log('Extracting content...');
    content = await page.evaluate(() => {
      // Function to clean text content
      const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

      // Function to extract section content
      const extractSection = (sectionName) => {
        console.log(`Extracting section: ${sectionName}`);
        // Try multiple selectors
        const selectors = [
          `[data-section="${sectionName}"]`,
          `[data-testid="${sectionName}"]`,
          `[role="${sectionName}"]`,
          `[aria-label="${sectionName}"]`,
          `.${sectionName}`,
          `#${sectionName}`
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            console.log(`Found element with selector: ${selector}`);
            return cleanText(element.textContent);
          }
        }
        console.log(`No element found for section: ${sectionName}`);
        return null;
      };

      // Extract all sections
      const sections = {
        about: extractSection('about'),
        experience: extractSection('experience'),
        education: extractSection('education'),
        skills: extractSection('skills')
      };

      // If no sections found, try to find any text content
      if (!Object.values(sections).some(Boolean)) {
        console.log('No sections found, extracting all text content');
        return cleanText(document.body.textContent);
      }

      return sections;
    });

    console.log('Content extracted:', content);
    return content;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  } finally {
    try {
      await page.close();
    } catch (error) {
      console.error('Error closing page:', error);
    }
  }
}

// Function to fetch website content
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  const baseUrl = 'https://rojapinnamraju-portfolio.netlify.app';
  console.log('Using base URL:', baseUrl);
  
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-experiments',
        '--safebrowsing-disable-auto-update'
      ],
      headless: 'new'
    });
    console.log('Browser launched successfully');

    // Fetch pages sequentially
    console.log('Fetching about page content...');
    const aboutContent = await fetchPageContent(browser, `${baseUrl}/about`);
    console.log('About page content:', aboutContent);

    console.log('Fetching projects page content...');
    const projectsContent = await fetchPageContent(browser, `${baseUrl}/projects`);
    console.log('Projects page content:', projectsContent);

    console.log('Fetching contact page content...');
    const contactContent = await fetchPageContent(browser, `${baseUrl}/contact`);
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
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
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