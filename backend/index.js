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
    const text = section.find('Text, p, div').text();
    console.log(`Extracted text: ${text}`);
    return cleanText(text);
  }

  // Try to find by heading and following content
  const heading = $(`h1, h2, h3, h4, h5, h6, [class*="heading"]`).filter((i, el) => {
    return $(el).text().toLowerCase().includes(sectionName.toLowerCase());
  });

  if (heading.length > 0) {
    console.log(`Found heading: ${heading.text()}`);
    const content = [];
    let current = heading.next();
    while (current.length > 0 && !current.is('h1, h2, h3, h4, h5, h6, [class*="heading"]')) {
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
    const text = classSection.find('Text, p, div').text();
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
  
  // Look for experience components
  $('.experience, [class*="experience"], [class*="Experience"], [class*="chakra-stack"]').each((i, el) => {
    const title = $(el).find('[class*="chakra-heading"], [class*="chakra-text"], Text').text();
    const company = $(el).find('[class*="chakra-text"], [class*="company"], [class*="employer"]').text();
    const period = $(el).find('[class*="chakra-text"], [class*="period"], [class*="date"]').text();
    const description = [];
    $(el).find('li, [class*="chakra-text"], [class*="description"], Text').each((j, item) => {
      const text = $(item).text().trim();
      if (text && !text.startsWith('•')) {
        description.push(cleanText(text));
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
      expSection.find('.experience, [class*="experience"], [class*="Experience"], [class*="chakra-stack"]').each((i, el) => {
        const title = $(el).find('[class*="chakra-heading"], [class*="chakra-text"], Text').text();
        const company = $(el).find('[class*="chakra-text"], [class*="company"], [class*="employer"]').text();
        const period = $(el).find('[class*="chakra-text"], [class*="period"], [class*="date"]').text();
        const description = [];
        $(el).find('li, [class*="chakra-text"], [class*="description"], Text').each((j, item) => {
          const text = $(item).text().trim();
          if (text && !text.startsWith('•')) {
            description.push(cleanText(text));
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

// Function to fetch page content with timeout and retry
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
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000 // 30 second timeout
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
        const content = {
          about: extractSection($, 'about'),
          experience: extractExperience($),
          education: extractEducation($),
          skills: extractSkills($)
        };
        console.log('Extracted about page content:', content);
        return content;
      } else if (url.includes('/projects')) {
        const projects = {};
        $('.project, [class*="project"]').each((i, el) => {
          const title = $(el).find('.project-title, h3, h4, .title').text();
          const description = $(el).find('.project-description, .description, [class*="description"]').text();
          if (title) {
            projects[cleanText(title)] = cleanText(description);
          }
        });
        console.log('Extracted projects:', projects);
        return projects;
      } else if (url.includes('/contact')) {
        const contact = {};
        $('.contact-item, [class*="contact"]').each((i, el) => {
          const type = $(el).find('.contact-type, .type, [class*="type"]').text();
          const value = $(el).find('.contact-value, .value, [class*="value"]').text();
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
      experience: aboutContent?.experience || [],
      education: aboutContent?.education || [],
      skills: aboutContent?.skills || [],
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
      experience: [],
      education: [],
      skills: [],
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
    const content = await fetchWebsiteContent();
    console.log('Sending response:', content);
    res.json(content);
  } catch (error) {
    console.error('Error in /api/content endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch content',
      message: error.message
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