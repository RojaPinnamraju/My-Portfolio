# Portfolio Backend

This is the backend server for Roja Pinnamraju's portfolio website. It provides chat functionality using Groq AI and content fetching capabilities.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
PORT=3000
GROQ_API_KEY=your_groq_api_key_here
NODE_ENV=development
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /content` - Fetches portfolio content
- `POST /chat` - Handles chat messages

## Deployment

This backend is configured to deploy on Render. The deployment is handled automatically when changes are pushed to the main branch.

### Environment Variables

Set these in your Render dashboard:
- `GROQ_API_KEY` - Your Groq API key
- `NODE_ENV` - Set to "production"

## Development

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server 