import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { HelmetProvider } from 'react-helmet-async';
import theme from './styles/theme';
import App from './App.tsx';

// Add error logging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Root element not found!');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>Something went wrong</h1>
      <p>Please try refreshing the page</p>
    </div>
  `;
}
