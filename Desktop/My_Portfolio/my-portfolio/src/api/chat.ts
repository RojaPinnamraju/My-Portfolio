import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not defined in environment variables');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful AI assistant for Roja Pinnamraju's portfolio website. 
Your role is to answer questions about Roja's projects, skills, and experience.
Keep your responses concise, professional, and focused on the portfolio content.
If you're not sure about something, it's better to say you don't know than to make assumptions.`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      model: 'llama3-70b-8192',
      temperature: 0.7,
      max_tokens: 1024,
    });

    return new Response(
      JSON.stringify({
        response: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process the request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 