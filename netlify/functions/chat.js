import { Groq } from 'groq-sdk';
import fetch from 'node-fetch';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to fetch website content
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  const baseUrl = 'https://rojapinnamraju-portfolio.netlify.app';
  console.log('Using base URL:', baseUrl);
  
  try {
    // Fetch pages sequentially
    const [aboutResponse, projectsResponse, contactResponse] = await Promise.all([
      fetch(`${baseUrl}/about`),
      fetch(`${baseUrl}/projects`),
      fetch(`${baseUrl}/contact`)
    ]);

    const [aboutHtml, projectsHtml, contactHtml] = await Promise.all([
      aboutResponse.text(),
      projectsResponse.text(),
      contactResponse.text()
    ]);

    // Log raw HTML for debugging
    console.log('About page HTML:', aboutHtml);
    console.log('Projects page HTML:', projectsHtml);
    console.log('Contact page HTML:', contactHtml);

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
  }
}

// Helper function to extract section content
function extractSectionContent(html, sectionAttribute) {
  console.log(`Extracting section with attribute: ${sectionAttribute}`);
  try {
    if (!html) {
      console.log(`No HTML content for ${sectionAttribute}`);
      return null;
    }

    // Try multiple selector strategies
    const selectors = [
      // Try with data-section attribute
      new RegExp(`<[^>]*data-section="${sectionAttribute}"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g'),
      // Try with class name
      new RegExp(`<[^>]*class="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g'),
      // Try with id
      new RegExp(`<[^>]*id="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g'),
      // Try with role
      new RegExp(`<[^>]*role="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g'),
      // Try with aria-label
      new RegExp(`<[^>]*aria-label="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g'),
      // Try with specific React component names
      new RegExp(`<[^>]*className="[^"]*${sectionAttribute}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g'),
      // Try with div and section tags
      new RegExp(`<(div|section)[^>]*>([\\s\\S]*?${sectionAttribute}[\\s\\S]*?)<\\/(div|section)>`, 'g'),
      // Try with any tag containing the section name
      new RegExp(`<[^>]*>([\\s\\S]*?${sectionAttribute}[\\s\\S]*?)<\\/[^>]*>`, 'g')
    ];

    for (const regex of selectors) {
      const match = regex.exec(html);
      if (match && match[1]) {
        // Remove HTML tags and clean up whitespace
        const content = match[1]
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        console.log(`Found content for ${sectionAttribute}:`, content);
        return content;
      }
    }

    // If no content found, try to find any text content in the page
    const textContent = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (textContent && textContent.length > 0) {
      console.log(`Using fallback content for ${sectionAttribute}`);
      return textContent;
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