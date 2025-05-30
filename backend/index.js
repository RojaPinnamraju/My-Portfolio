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
  origin: '*', // Allow all origins in development
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
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching content from ${url} (attempt ${attempt}/${retries})...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 30000 // 30 second timeout
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log('Content fetched successfully');
      console.log('HTML length:', html.length);
      console.log('First 500 characters of HTML:', html.substring(0, 500));

      // Load HTML into cheerio
      const $ = cheerio.load(html);
      
      // Log all sections found
      const sections = $('section[data-section]').map((i, el) => $(el).attr('data-section')).get();
      console.log('Found sections:', sections);
      
      // Extract content based on page type
      if (url.includes('/about') || url.includes('/#/about')) {
        console.log('Processing about page...');
        
        // Extract about section
        const aboutSection = $('section[data-section="about"]');
        console.log('About section found:', aboutSection.length > 0);
        const aboutText = aboutSection.find('Text, [class*="chakra-text"]').text();
        console.log('About text:', aboutText);

        // Extract experience
        const experiences = await page.evaluate(() => {
          const expSection = document.querySelector('section[data-section="experience"]');
          if (!expSection) return [];

          const items = [];
          const experienceElements = expSection.querySelectorAll('.experience, [class*="experience"], [class*="chakra-stack"]');
          
          experienceElements.forEach(el => {
            const title = el.querySelector('h2, [class*="chakra-heading"]')?.textContent.trim();
            const company = el.querySelector('[class*="chakra-text"][color="brand.500"]')?.textContent.trim();
            const period = el.querySelector('[class*="chakra-text"][font-size="sm"]')?.textContent.trim();
            const description = Array.from(el.querySelectorAll('[class*="chakra-text"]'))
              .map(item => item.textContent.trim())
              .filter(text => text && !text.startsWith('•') && text !== title && text !== company && text !== period);

            if (title && !items.some(item => item.title === title && item.company === company)) {
              items.push({
                title,
                company: company || '',
                period: period || '',
                description: description || []
              });
            }
          });

          return items;
        });
        console.log('Experiences:', experiences);

        // Extract education
        const education = await page.evaluate(() => {
          const eduSection = document.querySelector('section[data-section="education"]');
          if (!eduSection) return [];

          const items = [];
          const educationElements = eduSection.querySelectorAll('.education, [class*="education"], [class*="chakra-stack"]');
          
          educationElements.forEach(el => {
            const degree = el.querySelector('h2, [class*="chakra-heading"]')?.textContent.trim();
            const school = el.querySelector('[class*="chakra-text"][color="brand.500"]')?.textContent.trim();
            const period = el.querySelector('[class*="chakra-text"][font-size="sm"]')?.textContent.trim();
            const details = Array.from(el.querySelectorAll('[class*="chakra-text"]'))
              .map(item => item.textContent.trim())
              .filter(text => text && !text.startsWith('•') && text !== degree && text !== school && text !== period);

            if (degree && !items.some(item => item.degree === degree && item.school === school)) {
              items.push({
                degree,
                school: school || '',
                period: period || '',
                details: details || []
              });
            }
          });

          return items;
        });
        console.log('Education:', education);

        // Extract skills
        const skills = await page.evaluate(() => {
          const skillsSection = document.querySelector('section[data-section="skills"]');
          if (!skillsSection) return [];

          const items = [];
          const skillElements = skillsSection.querySelectorAll('.skill, [class*="skill"], [class*="Skill"], [class*="chakra-stack"]');
          
          skillElements.forEach(el => {
            const name = el.querySelector('[class*="chakra-text"][font-weight="medium"]')?.textContent.trim();
            const level = el.querySelector('[class*="chakra-progress"]')?.getAttribute('value') || 0;

            if (name && !items.some(item => item.name === name)) {
              items.push({
                name,
                level: parseInt(level) || 0
              });
            }
          });

          return items;
        });
        console.log('Skills:', skills);

        const content = {
          about: cleanText(aboutText),
          experience: experiences,
          education: education,
          skills: skills
        };
        console.log('Extracted about page content:', content);
        return content;
      } else if (url.includes('/projects') || url.includes('/#/projects')) {
        console.log('Processing projects page...');
        const projects = {};
        $('.project, [class*="project"], [class*="chakra-stack"]').each((i, el) => {
          const title = $(el).find('[class*="chakra-heading"], [class*="chakra-text"][font-weight="600"]').text();
          const description = $(el).find('[class*="chakra-text"]').text();
          if (title) {
            projects[cleanText(title)] = cleanText(description);
          }
        });
        console.log('Extracted projects:', projects);
        return projects;
      } else if (url.includes('/contact') || url.includes('/#/contact')) {
        console.log('Processing contact page...');
        const contact = {};
        $('.contact-item, [class*="contact"], [class*="chakra-stack"]').each((i, el) => {
          const type = $(el).find('[class*="chakra-text"][font-weight="600"]').text();
          const value = $(el).find('[class*="chakra-text"]').text();
          if (type) {
            contact[cleanText(type)] = cleanText(value);
          }
        });
        console.log('Extracted contact info:', contact);
        return contact;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching ${url} (attempt ${attempt}/${retries}):`, error);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

// Function to fetch website content with caching
async function fetchWebsiteContent() {
  console.log('Fetching website content...');
  let browser;
  try {
    // Configure Puppeteer based on environment
    const launchOptions = {
      headless: 'new',
      args: chromium.args,
      executablePath: process.env.NODE_ENV === 'production' 
        ? await chromium.executablePath()
        : undefined,
      ignoreHTTPSErrors: true
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // Set a longer timeout
    await page.setDefaultNavigationTimeout(30000);
    
    // Navigate to the main page
    console.log(`Navigating to ${portfolioUrl}...`);
    await page.goto(portfolioUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for React to load
    console.log('Waiting for React to load...');
    await page.waitForFunction(() => {
      return document.querySelector('#root') !== null;
    }, { timeout: 10000 });

    // Add a small delay to ensure content is rendered
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to each section and extract content
    const sections = ['about', 'projects', 'contact'];
    const content = {};

    for (const section of sections) {
      console.log(`Navigating to ${section} section...`);
      await page.goto(`${portfolioUrl}/#/${section}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for content to be rendered
      await page.waitForSelector('section[data-section]', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`Extracting ${section} content...`);
      const sectionContent = await page.evaluate((sectionName) => {
        const getText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : null;
        };

        const getSectionContent = (sectionName) => {
          const section = document.querySelector(`section[data-section="${sectionName}"]`);
          return section ? section.textContent.trim() : null;
        };

        const getSkills = () => {
          const skills = [];
          document.querySelectorAll('.skill').forEach(skill => {
            const name = skill.querySelector('.chakra-text')?.textContent.trim();
            const level = skill.querySelector('.chakra-progress')?.getAttribute('value');
            if (name) {
              skills.push({ name, level: parseInt(level) || 0 });
            }
          });
          return skills;
        };

        const getExperiences = () => {
          const experiences = [];
          document.querySelectorAll('.experience').forEach(exp => {
            const title = exp.querySelector('.title')?.textContent.trim();
            const company = exp.querySelector('.company')?.textContent.trim();
            const period = exp.querySelector('.period')?.textContent.trim();
            const description = Array.from(exp.querySelectorAll('.description .chakra-text'))
              .map(el => el.textContent.trim())
              .filter(text => text);
            
            if (title) {
              experiences.push({ title, company, period, description });
            }
          });
          return experiences;
        };

        const getEducation = () => {
          const education = [];
          document.querySelectorAll('.education').forEach(edu => {
            const degree = edu.querySelector('.degree')?.textContent.trim();
            const school = edu.querySelector('.school')?.textContent.trim();
            const period = edu.querySelector('.period')?.textContent.trim();
            const details = Array.from(edu.querySelectorAll('.details .chakra-text'))
              .map(el => el.textContent.trim())
              .filter(text => text);
            
            if (degree) {
              education.push({ degree, school, period, details });
            }
          });
          return education;
        };

        const getProjects = () => {
          const projects = {};
          document.querySelectorAll('[data-project]').forEach(project => {
            const id = project.getAttribute('data-project');
            const name = project.querySelector('.name')?.textContent.trim();
            const description = project.querySelector('.description')?.textContent.trim();
            const technologies = Array.from(project.querySelectorAll('.technology'))
              .map(el => el.textContent.trim());
            const links = Array.from(project.querySelectorAll('.link'))
              .map(el => el.href);
            
            if (name) {
              projects[id] = { name, description, technologies, links };
            }
          });
          return projects;
        };

        const getContact = () => {
          const contact = {};
          document.querySelectorAll('[data-contact]').forEach(el => {
            const type = el.getAttribute('data-contact');
            contact[type] = el.textContent.trim();
          });
          return contact;
        };

        switch (sectionName) {
          case 'about':
            return {
              about: getSectionContent('about'),
              experience: getExperiences(),
              education: getEducation(),
              skills: getSkills()
            };
          case 'projects':
            return { projects: getProjects() };
          case 'contact':
            return { contact: getContact() };
          default:
            return {};
        }
      }, section);

      Object.assign(content, sectionContent);
    }

    console.log('Content extracted successfully');
    await browser.close();
    return content;
  } catch (error) {
    console.error('Error fetching website content:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
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
    res.status(500).json({ error: 'Failed to fetch content' });
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