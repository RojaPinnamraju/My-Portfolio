const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Function to fetch page content
async function fetchPageContent(browser, url) {
  const page = await browser.newPage();
  let content = null;
  
  try {
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for React to render
    await page.waitForSelector('#root', { 
      state: 'attached',
      timeout: 30000 
    });
    
    // Additional wait for dynamic content
    await page.waitForTimeout(2000);

    // Extract content using multiple strategies
    content = await page.evaluate(() => {
      // Function to clean text content
      const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

      // Function to extract section content
      const extractSection = (sectionName) => {
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
            return cleanText(element.textContent);
          }
        }
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
        return cleanText(document.body.textContent);
      }

      return sections;
    });

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

    // Fetch pages sequentially
    const aboutContent = await fetchPageContent(browser, `${baseUrl}/about`);
    const projectsContent = await fetchPageContent(browser, `${baseUrl}/projects`);
    const contactContent = await fetchPageContent(browser, `${baseUrl}/contact`);

    // Log raw content for debugging
    console.log('About page content:', aboutContent);
    console.log('Projects page content:', projectsContent);
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

// API endpoint to fetch content
app.get('/api/content', async (req, res) => {
  try {
    const content = await fetchWebsiteContent();
    res.json(content);
  } catch (error) {
    console.error('Error in /api/content endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 