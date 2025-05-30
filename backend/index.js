const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');
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
  origin: ['https://my-portfolio-olw8.netlify.app', 'http://localhost:5173', 'http://localhost:8888'],
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

// Function to extract section content
const extractSection = ($, sectionName) => {
  console.log(`Attempting to extract section: ${sectionName}`);
  
  // Try to find the section by data-section attribute
  const section = $(`section[data-section="${sectionName}"]`);
  if (section.length > 0) {
    console.log(`Found section with data-section="${sectionName}"`);
    const text = section.find('Text, p, div, [class*="chakra-text"]').text();
    console.log(`Extracted text: ${text}`);
    return cleanText(text);
  }

  // Try to find by heading and following content
  const heading = $(`h1, h2, h3, h4, h5, h6, [class*="chakra-heading"]`).filter((i, el) => {
    return $(el).text().toLowerCase().includes(sectionName.toLowerCase());
  });

  if (heading.length > 0) {
    console.log(`Found heading: ${heading.text()}`);
    const content = [];
    let current = heading.next();
    while (current.length > 0 && !current.is('h1, h2, h3, h4, h5, h6, [class*="chakra-heading"]')) {
      content.push(cleanText(current.text()));
      current = current.next();
    }
    const result = content.join(' ');
    console.log(`Extracted content from heading: ${result}`);
    return result;
  }

  // Try to find by class name
  const classSection = $(`[class*="${sectionName.toLowerCase()}"]`);
  if (classSection.length > 0) {
    console.log(`Found section with class containing "${sectionName}"`);
    const text = classSection.find('Text, p, div, [class*="chakra-text"]').text();
    console.log(`Extracted text from class: ${text}`);
    return cleanText(text);
  }

  console.log(`No element found for section: ${sectionName}`);
  return null;
};

// Function to extract skills
const extractSkills = ($) => {
  console.log('Attempting to extract skills');
  const skills = [];
  
  // Look for skill components
  $('.skill, [class*="skill"], [class*="Skill"], [class*="chakra-stack"]').each((i, el) => {
    const name = $(el).find('Text, [class*="chakra-text"], [class*="chakra-heading"]').text();
    const level = $(el).find('progress, [class*="chakra-progress"]').attr('value') || 0;
    if (name) {
      console.log(`Found skill: ${name} with level ${level}`);
      skills.push({
        name: cleanText(name),
        level: parseInt(level) || 0
      });
    }
  });

  // If no skills found, try to find them in the skills section
  if (skills.length === 0) {
    const skillsSection = $('section[data-section="skills"]');
    if (skillsSection.length > 0) {
      skillsSection.find('.skill, [class*="skill"], [class*="Skill"], [class*="chakra-stack"]').each((i, el) => {
        const name = $(el).find('Text, [class*="chakra-text"], [class*="chakra-heading"]').text();
        const level = $(el).find('progress, [class*="chakra-progress"]').attr('value') || 0;
        if (name) {
          console.log(`Found skill in section: ${name} with level ${level}`);
          skills.push({
            name: cleanText(name),
            level: parseInt(level) || 0
          });
        }
      });
    }
  }

  console.log(`Extracted ${skills.length} skills`);
  return skills;
};

// Function to extract experience
const extractExperience = ($) => {
  console.log('Attempting to extract experience');
  const experiences = [];
  
  // Look for experience components with specific class names
  $('.experience, [class*="experience"], [class*="Experience"]').each((i, el) => {
    const title = $(el).find('.title, [class*="title"]').text();
    const company = $(el).find('.company, [class*="company"]').text();
    const period = $(el).find('.period, [class*="period"]').text();
    const description = [];
    $(el).find('.description li, .description p, [class*="description"] li, [class*="description"] p').each((j, item) => {
      const text = $(item).text().trim();
      if (text) {
        description.push(cleanText(text.replace(/^•\s*/, '')));  // Remove bullet points
      }
    });
    
    if (title) {
      console.log(`Found experience: ${title} at ${company}`);
      experiences.push({
        title: cleanText(title),
        company: cleanText(company),
        period: cleanText(period),
        description: description
      });
    }
  });

  // If no experiences found, try to find them in the experience section
  if (experiences.length === 0) {
    const expSection = $('section[data-section="experience"]');
    if (expSection.length > 0) {
      expSection.find('.experience, [class*="experience"], [class*="Experience"]').each((i, el) => {
        const title = $(el).find('.title, [class*="title"]').text();
        const company = $(el).find('.company, [class*="company"]').text();
        const period = $(el).find('.period, [class*="period"]').text();
        const description = [];
        $(el).find('.description li, .description p, [class*="description"] li, [class*="description"] p').each((j, item) => {
          const text = $(item).text().trim();
          if (text) {
            description.push(cleanText(text.replace(/^•\s*/, '')));  // Remove bullet points
          }
        });
        
        if (title) {
          console.log(`Found experience in section: ${title} at ${company}`);
          experiences.push({
            title: cleanText(title),
            company: cleanText(company),
            period: cleanText(period),
            description: description
          });
        }
      });
    }
  }

  console.log(`Extracted ${experiences.length} experiences`);
  return experiences;
};

// Function to extract education
const extractEducation = ($) => {
  console.log('Attempting to extract education');
  const education = [];
  
  // Look for education components
  $('.education, [class*="education"], [class*="Education"], [class*="chakra-stack"]').each((i, el) => {
    const degree = $(el).find('[class*="chakra-heading"], [class*="chakra-text"], Text').text();
    const school = $(el).find('[class*="chakra-text"], [class*="school"], [class*="institution"]').text();
    const period = $(el).find('[class*="chakra-text"], [class*="period"], [class*="date"]').text();
    const details = [];
    $(el).find('li, [class*="chakra-text"], [class*="detail"], Text').each((j, item) => {
      const text = $(item).text().trim();
      if (text && !text.startsWith('•')) {
        details.push(cleanText(text));
      }
    });
    
    if (degree) {
      console.log(`Found education: ${degree} at ${school}`);
      education.push({
        degree: cleanText(degree),
        school: cleanText(school),
        period: cleanText(period),
        details: details
      });
    }
  });

  // If no education found, try to find it in the education section
  if (education.length === 0) {
    const eduSection = $('section[data-section="education"]');
    if (eduSection.length > 0) {
      eduSection.find('.education, [class*="education"], [class*="Education"], [class*="chakra-stack"]').each((i, el) => {
        const degree = $(el).find('[class*="chakra-heading"], [class*="chakra-text"], Text').text();
        const school = $(el).find('[class*="chakra-text"], [class*="school"], [class*="institution"]').text();
        const period = $(el).find('[class*="chakra-text"], [class*="period"], [class*="date"]').text();
        const details = [];
        $(el).find('li, [class*="chakra-text"], [class*="detail"], Text').each((j, item) => {
          const text = $(item).text().trim();
          if (text && !text.startsWith('•')) {
            details.push(cleanText(text));
          }
        });
        
        if (degree) {
          console.log(`Found education in section: ${degree} at ${school}`);
          education.push({
            degree: cleanText(degree),
            school: cleanText(school),
            period: cleanText(period),
            details: details
          });
        }
      });
    }
  }

  console.log(`Extracted ${education.length} education entries`);
  return education;
};

// Function to fetch page content with Puppeteer
async function fetchPageContent(url, retries = 3) {
  console.log(`Fetching content from ${url} (attempt ${4 - retries}/3)`);
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30000 // Increase timeout to 30 seconds
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000); // Set navigation timeout to 30 seconds
    await page.setDefaultTimeout(30000); // Set default timeout to 30 seconds

    console.log('Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded successfully');

    // Wait for content to be rendered
    await page.waitForTimeout(2000);
    
    const content = await page.content();
    console.log('Content fetched successfully');
    return content;
  } catch (error) {
    console.error('Error fetching page content:', error);
    if (retries > 1) {
      console.log(`Retrying... (${retries - 1} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchPageContent(url, retries - 1);
    }
    throw new Error(`Failed to fetch content after 3 attempts: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to fetch website content with caching
async function fetchWebsiteContent() {
  console.log('Starting website content fetch...');
  const url = `${portfolioUrl}/#/about`;
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