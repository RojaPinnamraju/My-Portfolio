import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#f5f7fa',
      100: '#e4ecfa',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1', // Indigo
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    accent: {
      50: '#fdf2fa',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899', // Pink
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
    },
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    glass: {
      100: 'rgba(255,255,255,0.7)',
      900: 'rgba(30,41,59,0.7)',
    },
  },
  fonts: {
    heading: 'Inter, Poppins, sans-serif',
    body: 'Inter, Poppins, sans-serif',
  },
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(120deg, #f5f7fa 0%, #c7d2fe 100%)',
        color: 'gray.800',
        minHeight: '100vh',
      },
      '::selection': {
        background: 'accent.200',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'xl',
        letterSpacing: 'wide',
        boxShadow: 'md',
      },
      variants: {
        solid: {
          bgGradient: 'linear(to-r, brand.500, accent.500)',
          color: 'white',
          _hover: {
            bgGradient: 'linear(to-r, brand.600, accent.600)',
            transform: 'translateY(-2px) scale(1.04)',
            boxShadow: '2xl',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
            borderColor: 'accent.500',
            color: 'accent.600',
            transform: 'translateY(-2px) scale(1.04)',
            boxShadow: 'lg',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '2xl',
          boxShadow: '2xl',
          bg: 'glass.100',
          backdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.2)',
          _hover: {
            transform: 'translateY(-6px) scale(1.02)',
            transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
            boxShadow: '3xl',
          },
        },
      },
    },
  },
});

export default theme; 