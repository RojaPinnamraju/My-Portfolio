const { Groq } = require('groq-sdk');
const puppeteer = require('puppeteer');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to fetch website content
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log('Browser launched, navigating to pages...');
    const page = await browser.newPage();
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://rojapinnamraju-portfolio.netlify.app'
      : 'http://localhost:5173';
    
    // Fetch About page content
    await page.goto(`${baseUrl}/about`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('About page loaded, extracting content...');
    const aboutContent = await page.evaluate(() => {
      const sections = {};
      document.querySelectorAll('[data-section]').forEach(element => {
        const sectionName = element.getAttribute('data-section');
        sections[sectionName] = element.textContent.trim();
      });
      return sections;
    });

    // Fetch Projects page content
    await page.goto(`${baseUrl}/projects`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Projects page loaded, extracting content...');
    const projectsContent = await page.evaluate(() => {
      const projects = {};
      document.querySelectorAll('[data-project]').forEach(element => {
        const projectName = element.getAttribute('data-project');
        projects[projectName] = element.textContent.trim();
      });
      return projects;
    });

    // Fetch Contact page content
    await page.goto(`${baseUrl}/contact`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Contact page loaded, extracting content...');
    const contactContent = await page.evaluate(() => {
      const contact = {};
      document.querySelectorAll('[data-contact]').forEach(element => {
        const contactName = element.getAttribute('data-contact');
        contact[contactName] = element.textContent.trim();
      });
      return contact;
    });
    
    const content = {
      ...aboutContent,
      projects: projectsContent,
      contact: contactContent
    };
    
    console.log('Content extracted:', content);
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  } finally {
    await browser.close();
  }
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
${content.projects ? JSON.stringify(content.projects, null, 2) : 'No projects information available'}

My Contact Information:
${content.contact ? JSON.stringify(content.contact, null, 2) : 'No contact information available'}

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