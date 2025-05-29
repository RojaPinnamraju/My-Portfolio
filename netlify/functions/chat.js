const { Groq } = require('groq-sdk');
const fetch = require('node-fetch');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to fetch website content
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : 'https://rojapinnamraju-portfolio.netlify.app';
  console.log('Using base URL:', baseUrl);
  
  try {
    // Fetch About page content
    console.log('Fetching About page...');
    const aboutResponse = await fetch(`${baseUrl}/about`);
    if (!aboutResponse.ok) {
      throw new Error(`Failed to fetch About page: ${aboutResponse.status} ${aboutResponse.statusText}`);
    }
    const aboutHtml = await aboutResponse.text();
    console.log('About page HTML length:', aboutHtml.length);

    // Extract content using a more robust method
    const aboutContent = {
      about: extractSectionContent(aboutHtml, 'data-section="about"'),
      experience: extractSectionContent(aboutHtml, 'data-section="experience"'),
      education: extractSectionContent(aboutHtml, 'data-section="education"'),
      skills: extractSectionContent(aboutHtml, 'data-section="skills"')
    };
    console.log('Extracted About content:', aboutContent);

    // Fetch Projects page content
    console.log('Fetching Projects page...');
    const projectsResponse = await fetch(`${baseUrl}/projects`);
    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch Projects page: ${projectsResponse.status} ${projectsResponse.statusText}`);
    }
    const projectsHtml = await projectsResponse.text();
    console.log('Projects page HTML length:', projectsHtml.length);
    const projectsContent = extractProjectContent(projectsHtml);
    console.log('Extracted Projects content:', projectsContent);

    // Fetch Contact page content
    console.log('Fetching Contact page...');
    const contactResponse = await fetch(`${baseUrl}/contact`);
    if (!contactResponse.ok) {
      throw new Error(`Failed to fetch Contact page: ${contactResponse.status} ${contactResponse.statusText}`);
    }
    const contactHtml = await contactResponse.text();
    console.log('Contact page HTML length:', contactHtml.length);
    const contactContent = extractContactContent(contactHtml);
    console.log('Extracted Contact content:', contactContent);

    const content = {
      about: aboutContent.about || 'No information available',
      experience: aboutContent.experience || 'No information available',
      education: aboutContent.education || 'No information available',
      skills: aboutContent.skills || 'No information available',
      projects: projectsContent || {},
      contact: contactContent || {}
    };

    console.log('Final combined content:', content);
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

// Helper function to extract section content
function extractSectionContent(html, sectionAttribute) {
  const regex = new RegExp(`<[^>]*${sectionAttribute}[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'g');
  const match = regex.exec(html);
  if (match && match[1]) {
    // Remove HTML tags and clean up whitespace
    return match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return null;
}

// Helper function to extract project content
function extractProjectContent(html) {
  const projects = {};
  const regex = /<[^>]*data-project="([^"]*)"[^>]*>([\s\S]*?)<\/[^>]*>/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const [, name, content] = match;
    projects[name] = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return projects;
}

// Helper function to extract contact content
function extractContactContent(html) {
  const contacts = {};
  const regex = /<[^>]*data-contact="([^"]*)"[^>]*>([\s\S]*?)<\/[^>]*>/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const [, type, content] = match;
    contacts[type] = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return contacts;
}

// Chat endpoint
exports.handler = async (event, context) => {
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