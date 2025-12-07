import { Groq } from 'groq-sdk';
import fetch from 'node-fetch';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Add cache configuration at the top of the file
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes instead of 1 hour
let contentCache = null;
let lastFetchTime = null;
let isFetching = false;
let fetchPromise = null;

// Function to fetch GitHub repository content
async function fetchGitHubContent(githubUrl) {
  try {
    // Extract owner and repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    
    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    console.log(`Fetching GitHub content from: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for GitHub API
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Portfolio-Chatbot'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`GitHub API error: ${response.status}`);
      return null;
    }
    
    const repoData = await response.json();
    
    // Fetch README if available
    let readme = null;
    try {
      const readmeController = new AbortController();
      const readmeTimeoutId = setTimeout(() => readmeController.abort(), 3000); // 3 second timeout
      
      const readmeResponse = await fetch(`${apiUrl}/readme`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Portfolio-Chatbot'
        },
        signal: readmeController.signal
      });
      
      clearTimeout(readmeTimeoutId);
      
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        // Decode base64 content (Buffer works in Netlify Functions Node.js environment)
        if (readmeData.content) {
          try {
            readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
          } catch (e) {
            console.log('Error decoding README:', e.message);
          }
        }
      }
    } catch (readmeError) {
      console.log('Could not fetch README:', readmeError.message);
    }
    
    return {
      name: repoData.name,
      description: repoData.description,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      topics: repoData.topics || [],
      readme: readme,
      url: repoData.html_url,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at
    };
  } catch (error) {
    console.error('Error fetching GitHub content:', error.message);
    return null;
  }
}

// Function to fetch additional project information from GitHub
async function enrichProjectsWithGitHub(projects) {
  if (!projects || Object.keys(projects).length === 0) return projects;
  
  const enrichedProjects = { ...projects };
  
  // Process projects in parallel for better performance
  const enrichmentPromises = Object.entries(projects).map(async ([id, project]) => {
    if (project.links && project.links.length > 0) {
      // Find GitHub link
      const githubLink = project.links.find(link => link.includes('github.com'));
      
      if (githubLink) {
        try {
          console.log(`Enriching project ${project.name} with GitHub data...`);
          const githubData = await fetchGitHubContent(githubLink);
          
          if (githubData) {
            return {
              id,
              project: {
                ...project,
                github: {
                  description: githubData.description,
                  language: githubData.language,
                  stars: githubData.stars,
                  forks: githubData.forks,
                  topics: githubData.topics,
                  readme: githubData.readme ? githubData.readme.substring(0, 2000) : null, // Limit README size
                  url: githubData.url
                }
              }
            };
          }
        } catch (error) {
          console.log(`Failed to enrich project ${project.name}:`, error.message);
          // Return original project if enrichment fails
          return { id, project };
        }
      }
    }
    return { id, project };
  });
  
  // Wait for all enrichments (some may fail, that's okay)
  const results = await Promise.allSettled(enrichmentPromises);
  
  // Update enriched projects
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      enrichedProjects[result.value.id] = result.value.project;
    }
  });
  
  return enrichedProjects;
}

// Function to fetch website content
async function fetchWebsiteContent(forceRefresh = false) {
  console.log('Starting content fetch...');
  
  // Check if we have valid cached content and not forcing refresh
  if (!forceRefresh && contentCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
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
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 seconds

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
      // Force refresh content to get latest updates
      content = await fetchWebsiteContent(true);
      console.log('Content fetched successfully');
      
      // Enrich projects with GitHub data (non-blocking - don't wait if it takes too long)
      if (content.projects && Object.keys(content.projects).length > 0) {
        console.log('Enriching projects with GitHub information...');
        // Start GitHub enrichment but don't block on it
        enrichProjectsWithGitHub(content.projects)
          .then(enrichedProjects => {
            // Update cache with enriched data for future requests
            if (contentCache) {
              contentCache.projects = enrichedProjects;
            }
            console.log('Projects enriched with GitHub data (async)');
          })
          .catch(githubError => {
            console.log('GitHub enrichment failed (non-critical):', githubError.message);
            // Continue without GitHub data - not critical
          });
        
        // Try to get GitHub data with a short timeout, but don't fail if it times out
        try {
          const enrichedProjects = await Promise.race([
            enrichProjectsWithGitHub(content.projects),
            new Promise((_, reject) => setTimeout(() => reject(new Error('GitHub fetch timeout')), 5000))
          ]);
          content.projects = enrichedProjects;
          console.log('Projects enriched with GitHub data');
        } catch (githubError) {
          console.log('GitHub enrichment timed out or failed, continuing without it:', githubError.message);
          // Continue with original projects data - GitHub enrichment is optional
        }
      }
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
  ? Object.entries(content.projects).map(([id, project]) => {
      let projectInfo = `
Project: ${project.name}
Description: ${project.description}
Technologies Used: ${project.technologies.join(', ')}
Project Links: ${project.links.length > 0 ? project.links.join(', ') : 'No links available'}
`;
      
      // Add GitHub information if available
      if (project.github) {
        projectInfo += `
GitHub Information:
- Repository Description: ${project.github.description || 'N/A'}
- Primary Language: ${project.github.language || 'N/A'}
- Stars: ${project.github.stars || 0}
- Forks: ${project.github.forks || 0}
- Topics: ${project.github.topics.join(', ') || 'None'}
${project.github.readme ? `- README Excerpt: ${project.github.readme.substring(0, 500)}...` : ''}
`;
      }
      
      return projectInfo;
    }).join('\n\n')
  : 'No projects information available in my portfolio.'}

My Contact Information:
${content.contact && Object.keys(content.contact).length > 0
  ? Object.entries(content.contact).map(([type, value]) => `${type}: ${value}`).join('\n')
  : 'No contact information available in my portfolio.'}

Additional Context:
- You have access to GitHub repository information for projects that have GitHub links
- GitHub information includes: repository descriptions, primary languages, stars, forks, topics, and README content
- You can use this GitHub information to provide more detailed answers about projects
- For LinkedIn, you can mention the profile link if available in contact information

IMPORTANT RULES:
1. You can respond based on:
   - Information provided in the portfolio content above
   - GitHub repository information (README, descriptions, languages, topics) that has been fetched
   - Contact information and links provided
   - Any additional context from external sources mentioned above
2. For questions about projects, you can use:
   - Portfolio project descriptions
   - GitHub repository information (if available)
   - Technologies and languages from GitHub
   - README content from GitHub repositories
3. DO NOT make up information that is not in the provided content or GitHub data.
4. If information is not available in portfolio or GitHub, you can say: "I don't have that specific information available, but I can tell you about what I do know from my portfolio."
5. You can provide more detailed answers about projects using GitHub information when available.

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

7. If asked about something not covered in portfolio or GitHub information, you can say: "I don't have that specific information available, but based on my portfolio and GitHub repositories, I can tell you..."

8. For academic projects, mention what's explicitly stated in the education section, and you can also reference GitHub if the project has a repository

9. Keep responses focused on factual information from the portfolio content and GitHub repositories

10. Make responses conversational and natural, avoiding repetitive phrases

11. When discussing technical skills, only mention what's explicitly stated in the skills section

12. When talking about projects:
    - Only mention projects that are explicitly listed
    - Include the technologies used for each project (from portfolio and GitHub)
    - Mention any available links to the projects
    - If asked about a specific project, provide all available details including:
      * Portfolio description
      * GitHub repository information (if available)
      * Technologies and languages from GitHub
      * README content excerpts
      * Stars, forks, and topics from GitHub
    - If asked about technologies used in projects, mention technologies from both portfolio and GitHub data
    - You can provide more detailed technical information from GitHub READMEs when available

13. When discussing contact information:
    - Only share contact information that is explicitly provided
    - For social media links, mention the platform name (e.g., "You can find me on LinkedIn")
    - For email, only share if explicitly provided
    - Do not make up or infer contact information

14. For recruiters, focus only on the experience and achievements explicitly stated

15. Only mention technologies and frameworks that are explicitly listed

16. Only mention challenges that are explicitly stated in the content

17. Keep responses concise but informative

18. Use bullet points when listing multiple items for better readability

19. If you're unsure about any information, respond with: "I don't have that information in my portfolio."

20. When discussing experience, always include the company name and time period

21. When discussing education, always include the institution name and time period

22. When discussing projects, always mention the technologies used

23. When discussing skills, always mention the proficiency level if available

24. Keep responses focused on your actual experience and achievements

25. Do not make assumptions about future plans or aspirations

26. Do not provide advice or recommendations unless explicitly asked

27. Do not discuss salary or compensation information

28. Do not make comparisons with other professionals or companies

29. Do not discuss confidential or proprietary information

30. Do not make claims about technologies or frameworks you haven't used

31. Do not provide technical tutorials or code examples unless explicitly asked`;

    // Create chat completion with timeout
    const completionPromise = groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024
    });

    // Increase timeout for complex responses, but keep it shorter for simple ones
    const isSimpleMessage = /^(hi|hello|thanks|thank you|bye|goodbye|ok|great|thanks)$/i.test(message.trim());
    const timeoutDuration = isSimpleMessage ? 3000 : 5000; // 3 seconds for simple messages, 5 for complex ones

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chat completion timeout')), timeoutDuration);
    });

    try {
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
      console.error('Error in chat completion:', error);
      
      // For simple messages, provide a default response instead of an error
      if (isSimpleMessage) {
        const defaultResponses = {
          'hi': 'Hi!',
          'hello': 'Hello!',
          'thanks': 'You\'re welcome!',
          'thank you': 'You\'re welcome!',
          'bye': 'Goodbye!',
          'goodbye': 'Goodbye!',
          'ok': 'Great!',
          'great': 'Great!'
        };
        
        const defaultResponse = defaultResponses[message.trim().toLowerCase()] || 'Thanks!';
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ response: defaultResponse })
        };
      }
      
      // For complex messages, return a more specific error message
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