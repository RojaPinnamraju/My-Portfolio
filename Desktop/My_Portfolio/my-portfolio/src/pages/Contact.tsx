import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  useColorModeValue,
  Icon,
  HStack,
  VStack,
  useToast,
  Image,
  Flex,
} from '@chakra-ui/react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaGithub, FaLinkedin } from 'react-icons/fa';
import { motion } from 'framer-motion';

// Import the converted profile image
import profileImage from '../assets/profile_converted.png';

const MotionBox = motion(Box);

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would typically send the form data to your backend
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Message sent!',
        description: "I'll get back to you soon.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      toast({
        title: 'Error',
        description: "Couldn't send message. Please try again.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box py={20} bg={useColorModeValue('gray.50', 'gray.900')}>
      <Container maxW="container.xl">
        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
          <Heading
            fontSize={'3xl'}
            bgGradient="linear(to-r, brand.500, accent.500)"
            bgClip="text"
            fontWeight="extrabold"
          >
            Get in Touch
          </Heading>
          <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize={'lg'}>
            Have a project in mind or want to discuss potential opportunities? I'd love to hear from you!
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
          <MotionBox
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Stack spacing={8} align="center">
              <Box
                position="relative"
                width="300px"
                height="300px"
                borderRadius="full"
                overflow="hidden"
                boxShadow="2xl"
                mx="auto"
                mb={8}
                border="4px solid"
                borderColor="brand.500"
              >
                <Image
                  src={profileImage}
                  alt="Roja Pinnamraju"
                  width="100%"
                  height="100%"
                  objectFit="cover"
                  fallbackSrc="https://via.placeholder.com/300"
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    e.currentTarget.src = 'https://via.placeholder.com/300';
                  }}
                />
              </Box>

              <VStack spacing={6} align="start" width="100%">
                <VStack spacing={4} align="start" width="100%">
                  <HStack spacing={4}>
                    <Icon as={FaEnvelope} w={6} h={6} color="brand.500" />
                    <Text data-contact="email" fontSize="lg">rojapinnamraju@gmail.com</Text>
                  </HStack>
                  <HStack spacing={4}>
                    <Icon as={FaPhone} w={6} h={6} color="brand.500" />
                    <Text data-contact="phone" fontSize="lg">+1 (778) 899-5570</Text>
                  </HStack>
                </VStack>

                <VStack spacing={4} align="start" width="100%">
                  <Text fontWeight="bold" fontSize="xl">
                    Connect with me
                  </Text>
                  <HStack spacing={6}>
                    <Box
                      as="a"
                      href="https://github.com/RojaPinnamraju"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-contact="github"
                    >
                      <Icon
                        as={FaGithub}
                        w={8}
                        h={8}
                        color="gray.600"
                        _hover={{ color: 'brand.500', transform: 'scale(1.1)' }}
                        transition="all 0.2s"
                        cursor="pointer"
                      />
                    </Box>
                    <Box
                      as="a"
                      href="https://www.linkedin.com/in/pinnamrajuroja/"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-contact="linkedin"
                    >
                      <Icon
                        as={FaLinkedin}
                        w={8}
                        h={8}
                        color="gray.600"
                        _hover={{ color: 'brand.500', transform: 'scale(1.1)' }}
                        transition="all 0.2s"
                        cursor="pointer"
                      />
                    </Box>
                  </HStack>
                </VStack>
              </VStack>
            </Stack>
          </MotionBox>

          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <form onSubmit={handleSubmit}>
              <Stack
                spacing={6}
                p={8}
                bg={useColorModeValue('white', 'gray.800')}
                rounded={'xl'}
                boxShadow={'xl'}
              >
                <FormControl id="name" isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    type="text"
                    placeholder="Your name"
                    _focus={{
                      borderColor: 'brand.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                    }}
                  />
                </FormControl>
                <FormControl id="email" isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="your.email@example.com"
                    _focus={{
                      borderColor: 'brand.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                    }}
                  />
                </FormControl>
                <FormControl id="message" isRequired>
                  <FormLabel>Message</FormLabel>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your message"
                    rows={6}
                    _focus={{
                      borderColor: 'brand.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                    }}
                  />
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  isLoading={isSubmitting}
                  loadingText="Sending..."
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg',
                  }}
                >
                  Send Message
                </Button>
              </Stack>
            </form>
          </MotionBox>
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Contact; 