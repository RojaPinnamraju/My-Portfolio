import { Groq } from 'groq-sdk';
import { chromium } from 'playwright-core';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to fetch page content
async function fetchPageContent(browser, url) {
  const page = await browser.newPage();
  let content = null;
  
  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for React to render
    await page.waitForSelector('#root', { state: 'attached' });
    
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
    browser = await chromium.launch({
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
      headless: true
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
      projects: extractProjectContent(projectsContent || '') || {},
      contact: extractContactContent(contactContent || '') || {}
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

// Helper function to extract project content
function extractProjectContent(html) {
  console.log('Extracting project content');
  const projects = {};
  try {
    if (!html) {
      console.log('No HTML content for projects');
      return projects;
    }

    // Try multiple selector strategies
    const selectors = [
      /<[^>]*data-project="([^"]*)"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*id="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*className="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<(div|section)[^>]*>([\s\S]*?project[\s\S]*?)<\/(div|section)>/g
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
    if (!html) {
      console.log('No HTML content for contacts');
      return contacts;
    }

    // Try multiple selector strategies
    const selectors = [
      /<[^>]*data-contact="([^"]*)"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*class="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*id="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<[^>]*className="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/g,
      /<(div|section)[^>]*>([\s\S]*?contact[\s\S]*?)<\/(div|section)>/g
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

IMPORTANT RULES:
1. ONLY respond based on the information provided above. DO NOT make assumptions or add information that is not explicitly stated.
2. If the information is not available in the provided content, respond with: "I don't have that information in my portfolio."
3. DO NOT make up or infer details about experience, skills, or projects.
4. DO NOT provide generic responses or industry-standard information.
5. If asked about something not covered in the provided information, respond with: "I don't have that information in my portfolio."

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

7. If asked about something not covered in this information, respond with: "I don't have that information in my portfolio."

8. For academic projects, only mention what's explicitly stated in the education section

9. Keep responses focused on factual information from the portfolio content

10. Make responses conversational and natural, avoiding repetitive phrases

11. When discussing technical skills, only mention what's explicitly stated in the skills section

12. When talking about projects, only mention what's explicitly stated in the projects section

13. For recruiters, focus only on the experience and achievements explicitly stated

14. Only mention technologies and frameworks that are explicitly listed

15. Only mention challenges that are explicitly stated in the content

16. Keep responses concise but informative

17. Use bullet points when listing multiple items for better readability

18. If you're unsure about any information, respond with: "I don't have that information in my portfolio."`;

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