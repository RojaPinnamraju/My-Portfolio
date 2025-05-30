import { Groq } from 'groq-sdk';
import fetch from 'node-fetch';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to fetch website content
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  const backendUrl = process.env.BACKEND_URL || 'https://portfolio-backend-zwr8.onrender.com';
  console.log('Using backend URL:', backendUrl);
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    GROQ_API_KEY: process.env.GROQ_API_KEY ? 'Set' : 'Not Set'
  });
  
  try {
    const url = `${backendUrl}/api/content`;
    console.log('Making request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://rojapinnamraju-portfolio.netlify.app'
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const content = await response.json();
    console.log('Content fetched successfully');
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    if (error.name === 'AbortError' || error.type === 'request-timeout') {
      throw new Error('Request timed out after 5 seconds');
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

// Chat endpoint
export const handler = async function(event, context) {
  console.log('Chat function invoked');
  console.log('Event:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters
  });

  // Enable CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://rojapinnamraju-portfolio.netlify.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Received request:', {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers
    });

    if (!event.body) {
      console.error('No request body received');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No request body received' })
      };
    }

    const { message } = JSON.parse(event.body);
    console.log('Received message:', message);

    if (!message) {
      console.error('No message in request body');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No message provided' })
      };
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    console.log('Fetching website content...');
    let content;
    try {
      content = await fetchWebsiteContent();
      console.log('Content fetched successfully');
    } catch (error) {
      console.error('Error fetching content:', error);
      // Return a default response if content fetch fails
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          response: "I'm having trouble accessing my portfolio information right now. Please try again in a few moments."
        })
      };
    }

    const systemPrompt = `You are Roja Pinnamraju, a Software Engineer and AI enthusiast. You should respond to questions in first person, as if you are speaking directly to the user. Here is your information:

About Me:
${content.about}

My Professional Experience:
${content.experience.map(exp => `
${exp.title} at ${exp.company} (${exp.period})
${exp.description.map(desc => `- ${desc.replace(/^•\s*/, '')}`).join('\n')}
`).join('\n')}

My Education:
${content.education.map(edu => `
${edu.degree} at ${edu.school} (${edu.period})
${edu.details.map(detail => `- ${detail.replace(/^•\s*/, '')}`).join('\n')}
`).join('\n')}

My Technical Skills:
${content.skills.map(skill => `- ${skill.name}`).join('\n')}

My Projects:
${Object.entries(content.projects).map(([id, project]) => `
${project.name}:
${project.description}
Technologies: ${project.technologies.join(', ')}
Links: ${project.links.join(', ')}
`).join('\n')}

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
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        model: 'llama3-70b-8192',
        temperature: 0.7,
        max_tokens: 1024
      });

      console.log('Groq API response received');

      if (!completion.choices?.[0]?.message?.content) {
        console.error('No response content from Groq API');
        throw new Error('No response content from Groq API');
      }

      console.log('Sending response to client');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ response: completion.choices[0].message.content })
      };
    } catch (groqError) {
      console.error('Groq API Error:', groqError);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          response: "I'm having trouble processing your request right now. Please try again in a few moments."
        })
      };
    }
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
      headers,
      body: JSON.stringify({ 
        error: 'Sorry, I encountered an error. Please try again.',
        details: error.message
      })
    };
  }
}; 