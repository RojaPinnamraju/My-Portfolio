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
      await page.waitForSelector('div.App, div[class*="css-"]', { timeout: 30000 });

      // Click on About link to ensure we're on the right page
      console.log('Navigating to About page...');
      await page.evaluate(() => {
        const aboutLink = Array.from(document.querySelectorAll('a')).find(a => 
          a.textContent.includes('About') || a.href.includes('/about')
        );
        if (aboutLink) {
          aboutLink.click();
        }
      });

      // Wait for navigation to complete
      await page.waitForTimeout(2000);
      
      // Wait for React to finish rendering with a more robust check
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let attempts = 0;
          const checkReady = () => {
            attempts++;
            const app = document.querySelector('div.App, div[class*="css-"]');
            if (app && app.textContent.length > 1000) {
              resolve();
            } else if (attempts < 30) {
              setTimeout(checkReady, 1000);
            } else {
              resolve();
            }
          };
          checkReady();
        });
      });

      // Additional wait for dynamic content
      await page.waitForTimeout(5000);

      // Wait for specific sections to be rendered
      await Promise.all([
        page.waitForSelector('section[data-section="about"], div[class*="about"]', { timeout: 5000 }).catch(() => console.log('About section not found')),
        page.waitForSelector('section[data-section="experience"], div[class*="experience"]', { timeout: 5000 }).catch(() => console.log('Experience section not found')),
        page.waitForSelector('section[data-section="education"], div[class*="education"]', { timeout: 5000 }).catch(() => console.log('Education section not found'))
      ]);

      // Extract About page content first
      const aboutContent = await page.evaluate(() => {
        const app = document.querySelector('div.App, div[class*="css-"]');
        return app ? app.innerHTML : '';
      });

      // Now navigate to Projects page
      console.log('Navigating to Projects page...');
      await page.evaluate(() => {
        const projectsLink = Array.from(document.querySelectorAll('a')).find(a => 
          a.textContent.includes('Projects') || a.href.includes('/projects')
        );
        if (projectsLink) {
          projectsLink.click();
        }
      });

      // Wait for navigation to complete
      await page.waitForTimeout(2000);

      // Wait for React to finish rendering projects
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let attempts = 0;
          const checkReady = () => {
            attempts++;
            const app = document.querySelector('div.App, div[class*="css-"]');
            if (app && app.textContent.length > 1000) {
              resolve();
            } else if (attempts < 30) {
              setTimeout(checkReady, 1000);
            } else {
              resolve();
            }
          };
          checkReady();
        });
      });

      // Additional wait for dynamic content
      await page.waitForTimeout(5000);

      // Wait for projects section
      await page.waitForSelector('section[data-section="projects"], div[class*="projects"]', { timeout: 5000 })
        .catch(() => console.log('Projects section not found'));

      // Get Projects page content
      const projectsContent = await page.evaluate(() => {
        const app = document.querySelector('div.App, div[class*="css-"]');
        return app ? app.innerHTML : '';
      });

      // Now navigate to Contact page
      console.log('Navigating to Contact page...');
      await page.evaluate(() => {
        const contactLink = Array.from(document.querySelectorAll('a')).find(a => 
          a.textContent.includes('Contact') || a.href.includes('/contact')
        );
        if (contactLink) {
          contactLink.click();
        }
      });

      // Wait for navigation to complete
      await page.waitForTimeout(2000);

      // Wait for React to finish rendering contact page
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let attempts = 0;
          const checkReady = () => {
            attempts++;
            const app = document.querySelector('div.App, div[class*="css-"]');
            if (app && app.textContent.length > 1000) {
              resolve();
            } else if (attempts < 30) {
              setTimeout(checkReady, 1000);
            } else {
              resolve();
            }
          };
          checkReady();
        });
      });

      // Additional wait for dynamic content
      await page.waitForTimeout(5000);

      // Wait for contact section
      await page.waitForSelector('section[data-section="contact"], div[class*="contact"]', { timeout: 5000 })
        .catch(() => console.log('Contact section not found'));

      // Get Contact page content
      const contactContent = await page.evaluate(() => {
        const app = document.querySelector('div.App, div[class*="css-"]');
        return app ? app.innerHTML : '';
      });

      // Combine all content
      const combinedContent = aboutContent + projectsContent + contactContent;

      // Create a new Cheerio instance with the combined content
      const $ = cheerio.load(combinedContent);

      // Log the actual content for debugging
      console.log('App content length:', combinedContent.length);
      console.log('First 1000 chars of content:', combinedContent.substring(0, 1000));

      // Additional check for content loading
      const hasContent = await page.evaluate(() => {
        const text = document.body.textContent;
        return text.length > 1000 && (
          text.includes('Software Engineer') ||
          text.includes('Experience') ||
          text.includes('Education') ||
          text.includes('Skills') ||
          text.includes('Projects') ||
          text.includes('Contact')
        );
      });

      if (!hasContent) {
        console.log('Content not fully loaded, waiting additional time...');
        await page.waitForTimeout(5000);
      }

      // Return the combined HTML for processing
      return combinedContent;
    } catch (error) {
      console.error('Error waiting for React hydration:', error);
      throw error;
    }
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

      // Extract about section with more flexible selectors
      const aboutText = $('section[data-section="about"] p, section[data-section="about"] div[class*="chakra-text"], div[class*="about"] p, div[class*="about"] div[class*="chakra-text"], div[class*="chakra-container"] p, div[class*="chakra-container"] div[class*="chakra-text"]')
        .filter((i, el) => {
          const text = $(el).text().trim();
          return text.length > 50 && (text.includes('I am a Software Engineer') || text.includes('Software Engineer'));
        })
        .first()
        .text();
      console.log('About text extracted:', aboutText ? 'Yes' : 'No');

      // Extract skills with more flexible selectors
      const skills = [];
      const skillSet = new Set();
      $('.skill, div[class*="skill"], div[class*="chakra-stack"] div[class*="chakra-progress"], div[class*="chakra-container"] div[class*="chakra-progress"]').each((i, el) => {
        const $el = $(el);
        const name = $el.find('p[class*="chakra-text"], div[class*="chakra-text"], div[class*="text"], span[class*="chakra-text"]').text().trim();
        const level = parseInt($el.find('div[class*="chakra-progress"]').attr('aria-valuenow') || '0');
        
        if (name && !skillSet.has(name)) {
          skillSet.add(name);
          skills.push({
            name: cleanText(name),
            level: level
          });
        }
      });
      console.log('Skills extracted:', skills.length);

      // Extract experience with more flexible selectors
      const experiences = [];
      const experienceSet = new Set();
      $('.experience, div[class*="experience"], div[class*="chakra-stack"] div[class*="chakra-text"], div[class*="chakra-container"] div[class*="experience"]').each((i, el) => {
        const $el = $(el);
        const title = $el.find('.title, h2[class*="chakra-heading"], h2[class*="title"], h3[class*="chakra-heading"]').text().trim();
        const company = $el.find('.company, div[class*="brand"], div[class*="company"], div[class*="chakra-text"]').text().trim();
        const period = $el.find('.period, div[class*="gray"], div[class*="period"], div[class*="chakra-text"]').text().trim();
        
        if (title && company) {
          const description = [];
          $el.find('.description p, div[class*="description"] p, div[class*="chakra-text"]').each((j, desc) => {
            const text = $(desc).text().trim().replace(/^•\s*/, '');
            if (text && text.length > 10) {
              description.push(text);
            }
          });
          
          if (!experienceSet.has(title + company)) {
            experienceSet.add(title + company);
            experiences.push({
              title: cleanText(title),
              company: cleanText(company),
              period: cleanText(period),
              description: description.map(d => cleanText(d))
            });
          }
        }
      });
      console.log('Experiences extracted:', experiences.length);

      // Extract education with more flexible selectors
      const education = [];
      const educationSet = new Set();
      $('.education, div[class*="education"], div[class*="chakra-stack"] div[class*="chakra-text"], div[class*="chakra-container"] div[class*="education"]').each((i, el) => {
        const $el = $(el);
        const degree = $el.find('.degree, h2[class*="chakra-heading"], h2[class*="title"], h3[class*="chakra-heading"]').text().trim();
        const school = $el.find('.school, div[class*="brand"], div[class*="school"], div[class*="chakra-text"]').text().trim();
        const period = $el.find('.period, div[class*="gray"], div[class*="period"], div[class*="chakra-text"]').text().trim();
        
        if (degree && school) {
          const details = [];
          $el.find('.details p, div[class*="details"] p, div[class*="chakra-text"]').each((j, detail) => {
            const text = $(detail).text().trim().replace(/^•\s*/, '');
            if (text && text.length > 10) {
              details.push(text);
            }
          });
          
          if (!educationSet.has(degree + school)) {
            educationSet.add(degree + school);
            education.push({
              degree: cleanText(degree),
              school: cleanText(school),
              period: cleanText(period),
              details: details.map(d => cleanText(d))
            });
          }
        }
      });
      console.log('Education extracted:', education.length);

      // Extract projects with more flexible selectors
      const projects = {};
      const projectSet = new Set();
      
      // Debug: Log the HTML structure around potential project elements
      console.log('Searching for projects in HTML...');
      
      // Find all project stacks
      $('div[class*="chakra-stack"]').each((i, stack) => {
        const $stack = $(stack);
        
        // Check if this stack contains project information
        const hasProjectImage = $stack.find('img[alt]').length > 0;
        const hasProjectTitle = $stack.find('div[class*="chakra-stack"] > div').length > 0;
        
        // Skip contact information sections
        const isContactSection = $stack.find('a[href*="mailto:"], a[href*="tel:"]').length > 0;
        if (isContactSection) {
          return;
        }
        
        if (hasProjectImage || hasProjectTitle) {
          console.log(`\nAnalyzing project stack ${i + 1}:`);
          
          // Get project name from image alt or title
          const name = $stack.find('img[alt]').attr('alt') || '';
          console.log('Project name from alt:', name);
          
          // Skip if this is a contact/profile section
          if (name.toLowerCase().includes('roja') || name.toLowerCase().includes('pinnamraju')) {
            return;
          }
          
          // Get project description from the second stack div
          let description = $stack.find('div[class*="chakra-stack"] > div').eq(1).text().trim();
          
          // Clean up the description by removing the project name and technologies
          if (description.startsWith(name)) {
            description = description.substring(name.length).trim();
          }
          
          // Extract technologies from badges first
          const technologies = [];
          $stack.find('span[class*="chakra-badge"], span[class*="technology"]').each((j, tech) => {
            const techName = $(tech).text().trim();
            if (techName && techName.length > 2) {
              technologies.push(techName);
              // Remove the technology from the description with proper spacing
              description = description
                .replace(new RegExp(`\\b${techName}\\b`, 'g'), '') // Remove exact matches
                .replace(new RegExp(`\\s*,\\s*${techName}\\b`, 'g'), '') // Remove from comma lists
                .replace(new RegExp(`\\b${techName}\\s*,`, 'g'), '') // Remove with trailing comma
                .replace(new RegExp(`\\s*and\\s*${techName}\\b`, 'g'), '') // Remove from "and" lists
                .replace(new RegExp(`\\b${techName}\\s*and`, 'g'), '') // Remove with trailing "and"
                .trim();
            }
          });
          
          // Clean up common formatting issues
          description = description
            .replace(/\s*,\s*/g, ', ') // Fix spacing around commas
            .replace(/\s*\.\s*/g, '. ') // Fix spacing around periods
            .replace(/\s+/g, ' ') // Remove extra spaces
            .replace(/View Code|Live Demo/g, '') // Remove action buttons
            .replace(/\s*and\s*/g, ' and ') // Fix spacing around "and"
            .replace(/\s*using\s*/g, ' using ') // Fix spacing around "using"
            .replace(/\s*with\s*/g, ' with ') // Fix spacing around "with"
            .replace(/\s*that\s*/g, ' that ') // Fix spacing around "that"
            .replace(/\s*,\s*and\s*/g, ', and ') // Fix spacing around ", and"
            .replace(/\s*,\s*with\s*/g, ', with ') // Fix spacing around ", with"
            .replace(/\s*,\s*using\s*/g, ', using ') // Fix spacing around ", using"
            .replace(/\s*\.\s*and\s*/g, '. And ') // Fix spacing around ". and"
            .replace(/\s*\.\s*with\s*/g, '. With ') // Fix spacing around ". with"
            .replace(/\s*\.\s*using\s*/g, '. Using ') // Fix spacing around ". using"
            .replace(/\s*\.\s*that\s*/g, '. That ') // Fix spacing around ". that"
            .replace(/\s*\.\s*The\s*/g, '. The ') // Fix spacing around ". The"
            .replace(/\s*\.\s*This\s*/g, '. This ') // Fix spacing around ". This"
            .replace(/\s*\.\s*It\s*/g, '. It ') // Fix spacing around ". It"
            .replace(/\s*\.\s*I\s*/g, '. I ') // Fix spacing around ". I"
            .replace(/\s*\.\s*We\s*/g, '. We ') // Fix spacing around ". We"
            .replace(/\s*\.\s*Our\s*/g, '. Our ') // Fix spacing around ". Our"
            .replace(/\s*\.\s*The\s*/g, '. The ') // Fix spacing around ". The"
            .replace(/\s*\.\s*This\s*/g, '. This ') // Fix spacing around ". This"
            .replace(/\s*\.\s*It\s*/g, '. It ') // Fix spacing around ". It"
            .replace(/\s*\.\s*I\s*/g, '. I ') // Fix spacing around ". I"
            .replace(/\s*\.\s*We\s*/g, '. We ') // Fix spacing around ". We"
            .replace(/\s*\.\s*Our\s*/g, '. Our ') // Fix spacing around ". Our"
            .replace(/\s*\.\s*The\s*/g, '. The ') // Fix spacing around ". The"
            .replace(/\s*\.\s*This\s*/g, '. This ') // Fix spacing around ". This"
            .replace(/\s*\.\s*It\s*/g, '. It ') // Fix spacing around ". It"
            .replace(/\s*\.\s*I\s*/g, '. I ') // Fix spacing around ". I"
            .replace(/\s*\.\s*We\s*/g, '. We ') // Fix spacing around ". We"
            .replace(/\s*\.\s*Our\s*/g, '. Our ') // Fix spacing around ". Our"
            .replace(/\s*\.\s*The\s*/g, '. The ') // Fix spacing around ". The"
            .replace(/\s*\.\s*This\s*/g, '. This ') // Fix spacing around ". This"
            .replace(/\s*\.\s*It\s*/g, '. It ') // Fix spacing around ". It"
            .replace(/\s*\.\s*I\s*/g, '. I ') // Fix spacing around ". I"
            .replace(/\s*\.\s*We\s*/g, '. We ') // Fix spacing around ". We"
            .replace(/\s*\.\s*Our\s*/g, '. Our ') // Fix spacing around ". Our"
            .trim();
          
          // Remove any remaining technology names that might have been missed
          technologies.forEach(tech => {
            description = description
              .replace(new RegExp(`\\b${tech}\\b`, 'g'), '')
              .replace(/\s*,\s*,/g, ',') // Fix double commas
              .replace(/,\s*\./g, '.') // Fix comma before period
              .replace(/\s*,\s*and\s*/g, ' and ') // Fix comma before and
              .replace(/\s*and\s*,/g, ' and ') // Fix and before comma
              .replace(/\s*,\s*with\s*/g, ' with ') // Fix comma before with
              .replace(/\s*with\s*,/g, ' with ') // Fix with before comma
              .replace(/\s*,\s*using\s*/g, ' using ') // Fix comma before using
              .replace(/\s*using\s*,/g, ' using ') // Fix using before comma
              .trim();
          });
          
          console.log('Project description:', description);
          
          if (name && !projectSet.has(name)) {
            projectSet.add(name);
            
            console.log('Found technologies:', technologies);
            
            // Extract links
            const links = [];
            $stack.find('a[href]').each((j, link) => {
              const href = $(link).attr('href');
              if (href && !href.includes('#') && !href.includes('localhost')) {
                links.push(href);
              }
            });
            console.log('Found links:', links);
            
            projects[`project-${i + 1}`] = {
              name: cleanText(name),
              description: cleanText(description),
              technologies: technologies.length > 0 ? technologies.map(t => cleanText(t)) : ['Not specified'],
              links: links
            };
          }
        }
      });
      
      console.log('\nProjects extraction summary:');
      console.log('Total projects found:', Object.keys(projects).length);
      if (Object.keys(projects).length > 0) {
        console.log('Project names:', Object.values(projects).map(p => p.name));
        console.log('Project details:', JSON.stringify(projects, null, 2));
      }

      // Extract contact information with more flexible selectors
      const contact = {};
      const contactSet = new Set();
      
      // Look for contact information in various places
      $('section[data-section="contact"], footer, [class*="contact"], nav, div[class*="chakra-container"]').find('a[href]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim().toLowerCase();
        
        // Skip navigation links
        if (text === 'home' || text === 'about' || text === 'projects' || text === 'contact') {
          return;
        }
        
        if (href && !contactSet.has(href)) {
          contactSet.add(href);
          
          if (href.startsWith('mailto:')) {
            contact.email = href.replace('mailto:', '');
          } else if (href.includes('linkedin.com')) {
            contact.linkedin = href;
          } else if (href.includes('github.com')) {
            contact.github = href;
          } else if (href.includes('twitter.com')) {
            contact.twitter = href;
          } else if (href.includes('instagram.com')) {
            contact.instagram = href;
          } else if (text === 'live demo' || text === 'demo') {
            contact.demo = href;
          } else if (text && !contact[text]) {
            contact[text] = href;
          }
        }
      });

      // Also look for contact information in text content
      $('section[data-section="contact"], footer, [class*="contact"]').find('p, div[class*="chakra-text"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('@') && text.includes('.')) {
          const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (email && !contact.email) {
            contact.email = email[0];
          }
        }
      });

      // Log the actual contact information for debugging
      console.log('Contact information:', contact);
      console.log('Contact info extracted:', Object.keys(contact).length);

      // Log extraction results
      console.log('Extracted content:', {
        skills: skills.map(s => s.name),
        experiences: experiences.map(e => ({ title: e.title, company: e.company })),
        education: education.map(e => ({ degree: e.degree, school: e.school })),
        projects: Object.keys(projects),
        contact: Object.keys(contact)
      });

      const content = {
        about: aboutText,
        skills,
        experience: experiences,
        education,
        projects,
        contact
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