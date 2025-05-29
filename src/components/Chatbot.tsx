import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Input,
  Text,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  Flex,
  useColorModeValue,
  Badge,
  Avatar,
  Heading,
  Tooltip,
  Image,
} from '@chakra-ui/react';
import { ChatIcon, CloseIcon } from '@chakra-ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import profileImage from '../assets/profile_converted.png';

// Create audio elements with proper loading
const createAudio = (url: string, volume: number) => {
  const audio = new Audio(url);
  audio.volume = volume;
  audio.preload = 'auto';
  return audio;
};

const openSound = createAudio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', 0.3);
const messageSound = createAudio('https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3', 0.2);
const entranceSound = createAudio('https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3', 0.4);

// Preload sounds
[openSound, messageSound, entranceSound].forEach(sound => {
  sound.load();
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MotionBox = motion(Box);

const Chatbot = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const hasPlayedSound = useRef(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const userBgColor = useColorModeValue('brand.50', 'brand.900');
  const assistantBgColor = useColorModeValue('gray.50', 'gray.700');

  // Play entrance animation and sound after a short delay
  useEffect(() => {
    const playEntranceSound = async () => {
      try {
        if (!hasPlayedSound.current) {
          // Reset the sound to the beginning
          entranceSound.currentTime = 0;
          await entranceSound.play();
          hasPlayedSound.current = true;
        }
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    };

    const timer = setTimeout(() => {
      setIsVisible(true);
      playEntranceSound();
    }, 2000);

    return () => {
      clearTimeout(timer);
      // Cleanup audio
      entranceSound.pause();
      entranceSound.currentTime = 0;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOpen = async () => {
    if (isFirstOpen) {
      try {
        openSound.currentTime = 0;
        await openSound.play();
        setIsFirstOpen(false);
      } catch (error) {
        console.error('Error playing open sound:', error);
      }
    }
    onOpen();
  };

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://portfolio-backend.onrender.com'
        : 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      try {
        messageSound.currentTime = 0;
        await messageSound.play();
      } catch (error) {
        console.error('Error playing message sound:', error);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <MotionBox
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          >
            <Tooltip label="Chat with me" placement="left">
              <Box
                position="fixed"
                bottom="6"
                right="6"
                zIndex="999"
                cursor="pointer"
                onClick={handleOpen}
                _hover={{
                  transform: 'scale(1.1)',
                }}
                transition="all 0.2s"
              >
                <Box
                  w="80px"
                  h="80px"
                  borderRadius="full"
                  overflow="hidden"
                  border="4px solid"
                  borderColor="brand.500"
                  boxShadow="xl"
                  _hover={{
                    boxShadow: '2xl',
                  }}
                  bg="white"
                >
                  <Image
                    src={profileImage}
                    alt="Profile"
                    w="full"
                    h="full"
                    objectFit="cover"
                    fallbackSrc="https://via.placeholder.com/80"
                  />
                </Box>
                <Badge
                  position="absolute"
                  bottom="-2"
                  right="-2"
                  colorScheme="brand"
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="sm"
                  fontWeight="bold"
                  boxShadow="md"
                >
                  Chat
                </Badge>
              </Box>
            </Tooltip>
          </MotionBox>
        )}
      </AnimatePresence>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" bg={useColorModeValue('brand.50', 'brand.900')}>
            <Flex align="center" gap={3}>
              <Box
                w="50px"
                h="50px"
                borderRadius="full"
                overflow="hidden"
                border="3px solid"
                borderColor="brand.500"
                bg="white"
              >
                <Image
                  src={profileImage}
                  alt="Profile"
                  w="full"
                  h="full"
                  objectFit="cover"
                  fallbackSrc="https://via.placeholder.com/50"
                />
              </Box>
              <Box>
                <Heading size="sm">Chat with me</Heading>
                <Badge colorScheme="brand" fontSize="xs">AI Assistant</Badge>
              </Box>
            </Flex>
          </DrawerHeader>

          <DrawerBody>
            <VStack h="full" spacing={4}>
              <Box
                flex="1"
                w="full"
                overflowY="auto"
                p={4}
                bg={bgColor}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
              >
                {messages.length === 0 && (
                  <VStack spacing={4} align="center" justify="center" h="full" opacity={0.7}>
                    <Text fontSize="lg" fontWeight="bold" color="brand.500">
                      Welcome! 👋
                    </Text>
                    <Text textAlign="center" color={useColorModeValue('gray.600', 'gray.400')}>
                      I'm your AI assistant. Ask me anything about Roja's experience, skills, or projects!
                    </Text>
                  </VStack>
                )}
                {messages.map((message, index) => (
                  <MotionBox
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    mb={4}
                  >
                    <Flex
                      justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
                      align="flex-start"
                      gap={2}
                    >
                      {message.role === 'assistant' && (
                        <Avatar
                          size="sm"
                          name="AI Assistant"
                          bg="brand.500"
                          color="white"
                        />
                      )}
                      <Box
                        maxW="80%"
                        p={3}
                        borderRadius="lg"
                        bg={message.role === 'user' ? userBgColor : assistantBgColor}
                        boxShadow="sm"
                      >
                        <Text>{message.content}</Text>
                      </Box>
                      {message.role === 'user' && (
                        <Avatar
                          size="sm"
                          name="You"
                          bg="gray.500"
                          color="white"
                        />
                      )}
                    </Flex>
                  </MotionBox>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              <Flex w="full" gap={2}>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about experience, skills, or projects..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                  disabled={isLoading}
                  size="lg"
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                  }}
                />
                <Button
                  colorScheme="brand"
                  onClick={() => handleSend(input)}
                  isLoading={isLoading}
                  size="lg"
                  px={6}
                >
                  Send
                </Button>
              </Flex>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default Chatbot; 