import { Groq } from 'groq-sdk';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to fetch website content using Puppeteer
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  const baseUrl = 'https://rojapinnamraju-portfolio.netlify.app';
  console.log('Using base URL:', baseUrl);
  
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: [
        ...chrome.args,
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
      defaultViewport: { width: 1280, height: 800 },
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await chrome.executablePath(),
      headless: chrome.headless,
      ignoreHTTPSErrors: true,
    });

    const pageLoadTimeout = 5000;

    async function fetchPageContent(url) {
      const page = await browser.newPage();
      try {
        await page.setDefaultNavigationTimeout(pageLoadTimeout);
        await page.goto(url, { 
          waitUntil: 'networkidle0',
          timeout: pageLoadTimeout 
        });
        return await page.content();
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return null;
      } finally {
        await page.close().catch(console.error);
      }
    }

    const [aboutHtml, projectsHtml, contactHtml] = await Promise.all([
      fetchPageContent(`${baseUrl}/about`),
      fetchPageContent(`${baseUrl}/projects`),
      fetchPageContent(`${baseUrl}/contact`)
    ]);

    const content = {
      about: extractSectionContent(aboutHtml || '', 'about') || 'No information available',
      experience: extractSectionContent(aboutHtml || '', 'experience') || 'No information available',
      education: extractSectionContent(aboutHtml || '', 'education') || 'No information available',
      skills: extractSectionContent(aboutHtml || '', 'skills') || 'No information available',
      projects: extractProjectContent(projectsHtml || '') || {},
      contact: extractContactContent(contactHtml || '') || {}
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

// Helper function to extract section content
function extractSectionContent(html, sectionAttribute) {
  console.log(`Extracting section with attribute: ${sectionAttribute}`);
  try {
    // First try with data-section attribute
    const regex = new RegExp(`<[^>]*${sectionAttribute}[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g');
    let match = regex.exec(html);
    
    if (!match) {
      // Try with class name as fallback
      const classRegex = new RegExp(`<[^>]*class="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g');
      match = classRegex.exec(html);
    }
    
    if (!match) {
      // Try with id as fallback
      const idRegex = new RegExp(`<[^>]*id="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g');
      match = idRegex.exec(html);
    }

    if (match && match[1]) {
      // Remove HTML tags and clean up whitespace
      const content = match[1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      console.log(`Found content for ${sectionAttribute}:`, content);
      return content;
    }
    console.log(`No content found for ${sectionAttribute}`);
    return null;
  } catch (error) {
    console.error(`Error extracting ${sectionAttribute}:`, error);
    return null;
  }
}

// Helper function to extract project content
function extractProjectContent(html) {
  console.log('Extracting project content');
  const projects = {};
  try {
    // Try multiple selectors
    const selectors = [
      /<[^>]*data-project="([^"]*)"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*id="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g
    ];

    for (const regex of selectors) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        const [, name, content] = match;
        if (name && content) {
          projects[name] = content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log(`Found project: ${name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting projects:', error);
  }
  
  console.log('Extracted projects:', projects);
  return projects;
}

// Helper function to extract contact content
function extractContactContent(html) {
  console.log('Extracting contact content');
  const contacts = {};
  try {
    // Try multiple selectors
    const selectors = [
      /<[^>]*data-contact="([^"]*)"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*class="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*id="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g
    ];

    for (const regex of selectors) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        const [, type, content] = match;
        if (type && content) {
          contacts[type] = content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log(`Found contact: ${type}`);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting contacts:', error);
  }
  
  console.log('Extracted contacts:', contacts);
  return contacts;
}

// Chat endpoint
export const handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('Received chat request');
    const { message } = JSON.parse(event.body);
    console.log('Message received:', message);

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set');
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    console.log('Fetching website content...');
    const content = await fetchWebsiteContent();
    console.log('Content fetched successfully');

    const systemPrompt = `You are Roja Pinnamraju, a Software Engineer and AI enthusiast. You should respond to questions in first person, as if you are speaking directly to the user. Here is your information:

About Me:
${content.about}

My Professional Experience:
${content.experience}

My Education:
${content.education}

My Technical Skills:
${content.skills}

My Projects:
${Object.entries(content.projects).map(([name, desc]) => `${name}: ${desc}`).join('\n')}

My Contact Information:
${Object.entries(content.contact).map(([type, value]) => `${type}: ${value}`).join('\n')}

When responding:
1. ONLY give your full introduction when:
   - It's the very first message in a conversation
   - The user explicitly asks about your background or experience
   - The user asks a specific question about your skills or projects
   DO NOT give the full introduction for any other reason

2. For simple interactions, keep responses extremely short:
   - "hi", "hello" → "Hi!" or "Hello!"
   - "how are you" → "I'm good, thanks!"
   - "ok", "great", "thanks" → "Great!" or "Thanks!"
   - "bye", "goodbye" → "Goodbye!"
   DO NOT add any additional text to these responses

3. Always speak in first person (use "I", "my", "me")

4. Be friendly and professional, but keep responses concise

5. ONLY respond based on the information provided above

6. DO NOT make assumptions or create fictional projects/experiences

7. If asked about something not covered in this information, respond with: "I don't have that information in my portfolio, but I'd be happy to discuss what I do know about my experience and skills."

8. For academic projects, only mention what's explicitly stated in the education section

9. Keep responses focused on factual information from the portfolio content

10. Make responses conversational and natural, avoiding repetitive phrases

11. When discussing technical skills, highlight how you've applied them in real projects

12. When talking about projects, emphasize the impact and results achieved

13. For recruiters, focus on your most relevant experience and achievements

14. Be specific about technologies and frameworks you've used

15. Mention any notable challenges you've overcome in your projects

16. Highlight your passion for technology and continuous learning

17. Keep responses concise but informative

18. Use bullet points when listing multiple items for better readability`;

    console.log('Creating chat completion...');
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'llama3-70b-8192',
      temperature: 0.7,
      max_tokens: 1024,
    });
    console.log('Chat completion created successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response: completion.choices[0].message.content })
    };
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status
    });
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Sorry, I encountered an error. Please try again.',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}; 