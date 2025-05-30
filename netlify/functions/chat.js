import { Groq } from 'groq-sdk';
import fetch from 'node-fetch';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Add cache configuration at the top of the file
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
let contentCache = null;
let lastFetchTime = null;
let isFetching = false;
let fetchPromise = null;

// Function to fetch website content
async function fetchWebsiteContent() {
  console.log('Starting content fetch...');
  
  // Check if we have valid cached content
  if (contentCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    console.log('Returning cached content');
    return contentCache;
  }

  // If we're already fetching, return the existing promise
  if (isFetching && fetchPromise) {
    console.log('Fetch already in progress, waiting for result');
    return fetchPromise;
  }

  // Start new fetch
  isFetching = true;
  fetchPromise = (async () => {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const backendUrl = process.env.BACKEND_URL || 'https://portfolio-backend-zwr8.onrender.com';
        console.log('Using backend URL:', backendUrl);
        
        // Try to warm up the backend first
        try {
          const warmupUrl = `${backendUrl}/warmup`;
          console.log('Warming up backend...');
          await fetch(warmupUrl, { 
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Origin': 'https://rojapinnamraju-portfolio.netlify.app'
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout for warmup
          });
        } catch (warmupError) {
          console.log('Warm-up failed, continuing with content fetch:', warmupError.message);
        }
        
        const url = `${backendUrl}/api/content`;
        console.log('Making request to:', url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://rojapinnamraju-portfolio.netlify.app'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const content = await response.json();
        console.log('Content fetched successfully');

        // Update cache
        contentCache = content;
        lastFetchTime = Date.now();
        
        return content;
      } catch (error) {
        console.error(`Error fetching content (attempt ${retryCount + 1}/${maxRetries}):`, error);
        
        if (retryCount === maxRetries - 1) {
          // On last retry, return cached content if available
          if (contentCache) {
            console.log('Returning expired cached content due to error');
            return contentCache;
          }
          throw new Error('Failed to fetch content after all retries');
        }
        
        // Wait before retrying with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
  })();

  return fetchPromise;
}

// Chat endpoint
export const handler = async function(event, context) {
  console.log('Chat function invoked');
  
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
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No request body received' })
      };
    }

    const { message } = JSON.parse(event.body);
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No message provided' })
      };
    }

    if (!process.env.GROQ_API_KEY) {
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
      console.error('Failed to fetch content:', error);
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
${content.about || "I am a passionate software engineer with experience in building web applications, AI solutions, and scalable systems. I love solving complex problems and learning new technologies."}

My Professional Experience:
${content.experience && content.experience.length > 0 
  ? content.experience.map(exp => `
${exp.title} at ${exp.company} (${exp.period})
${exp.description.map(desc => `- ${desc}`).join('\n')}
`).join('\n')
  : 'No experience information available in my portfolio.'}

My Education:
${content.education && content.education.length > 0
  ? content.education.map(edu => `
${edu.degree} at ${edu.school} (${edu.period})
${edu.details.map(detail => `- ${detail}`).join('\n')}
`).join('\n')
  : 'No education information available in my portfolio.'}

My Technical Skills:
${content.skills && content.skills.length > 0 
  ? content.skills.map(skill => `- ${skill.name} (${skill.level}%)`).join('\n')
  : 'No skills information available in my portfolio.'}

My Areas of Expertise:
${content.expertise && content.expertise.length > 0
  ? content.expertise.map(exp => `- ${exp.title}: ${exp.description}`).join('\n')
  : 'No expertise information available in my portfolio.'}

My Projects:
${content.projects && Object.keys(content.projects).length > 0
  ? Object.entries(content.projects).map(([id, project]) => `
${project.name}:
${project.description}
Technologies: ${project.technologies.join(', ')}
Links: ${project.links.join(', ')}
`).join('\n')
  : 'No projects information available in my portfolio.'}

My Contact Information:
${content.contact && Object.keys(content.contact).length > 0
  ? Object.entries(content.contact).map(([type, value]) => `${type}: ${value}`).join('\n')
  : 'No contact information available in my portfolio.'}

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

18. If you're unsure about any information, respond with: "I don't have that information in my portfolio."

19. When discussing experience, always include the company name and time period

20. When discussing education, always include the institution name and time period

21. When discussing projects, always mention the technologies used

22. When discussing skills, always mention the proficiency level if available

23. Keep responses focused on your actual experience and achievements

24. Do not make assumptions about future plans or aspirations

25. Do not provide advice or recommendations unless explicitly asked

26. Do not discuss salary or compensation information

27. Do not make comparisons with other professionals or companies

28. Do not discuss confidential or proprietary information

29. Do not make claims about technologies or frameworks you haven't used

30. Do not provide technical tutorials or code examples unless explicitly asked`;

    // Create chat completion with timeout
    const completionPromise = groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'llama3-70b-8192',
      temperature: 0.7,
      max_tokens: 1024
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chat completion timeout')), 5000);
    });

    const completion = await Promise.race([completionPromise, timeoutPromise]);

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('No response content from Groq API');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: completion.choices[0].message.content })
    };
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    // Return a user-friendly error message
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: "I'm having trouble processing your request right now. Please try again in a few moments."
      })
    };
  }
}; 