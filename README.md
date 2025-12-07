# Roja Pinnamraju's Portfolio

Welcome to my personal portfolio website! This is a modern, responsive portfolio built with React, TypeScript, and Chakra UI to showcase my projects, skills, and experience. The portfolio includes an AI-powered chatbot that can answer questions about my background and experience.

## 🚀 Features

- **Modern Design**: Clean and professional UI built with Chakra UI
- **Responsive**: Fully responsive design that works on all devices
- **Project Showcase**: Detailed display of my projects with descriptions and links
- **Interactive Components**: Smooth animations and transitions
- **Contact Form**: Easy way to get in touch
- **AI Chatbot**: Interactive chatbot powered by Groq AI that can answer questions about my experience and projects
- **Dynamic Content**: Content is automatically extracted from the website and kept up-to-date
- **Real-time Updates**: Changes to the website are reflected in the chatbot's responses

## 🛠️ Technologies Used

### Frontend
- React 18
- TypeScript
- Vite
- Chakra UI
- React Router
- Framer Motion (for animations)

### Backend
- Node.js
- Express.js
- Puppeteer (for content extraction)
- Cheerio (for HTML parsing)

### AI Integration
- Groq AI API
- Netlify Functions (for serverless deployment)

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/RojaPinnamraju/My-Portfolio.git
```

2. Navigate to the project directory:
```bash
cd My-Portfolio
```

3. Install frontend dependencies:
```bash
npm install
```

4. Install backend dependencies:
```bash
cd backend
npm install
```

5. Set up environment variables:
   - Create a `.env` file in the root directory
   - Create a `.env` file in the `backend` directory
   - Add required environment variables (see Environment Variables section)

6. Start the development servers:
   - Frontend: `npm run dev` (in root directory)
   - Backend: `npm start` (in backend directory)

## 🏗️ Project Structure

```
├── src/                    # Frontend source code
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── styles/           # Global styles and theme
│   └── assets/           # Static assets
├── backend/              # Backend server
│   ├── index.js         # Main server file
│   └── package.json     # Backend dependencies
└── netlify/             # Netlify configuration
    └── functions/       # Serverless functions
        └── chat.js      # AI chatbot function
```

## 🔧 Environment Variables

### Frontend (.env)
```
VITE_BACKEND_URL=http://localhost:3000
```

### Backend (.env)
```
PORT=3000
NODE_ENV=development
```

### Netlify Functions (.env)
```
GROQ_API_KEY=your_groq_api_key
BACKEND_URL=your_backend_url
```

## 🚀 Deployment

The portfolio is deployed using:
- Frontend: Netlify
- Backend: Render
- AI Chatbot: Netlify Functions

Any push to the main branch will automatically trigger a new deployment of the frontend and chatbot. The backend needs to be deployed separately on Render.

## 🤝 Contact

Feel free to reach out to me through:
- LinkedIn: [Your LinkedIn Profile]
- Email: [Your Email]
- GitHub: [Your GitHub Profile]
