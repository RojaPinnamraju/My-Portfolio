import React from 'react';
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
} from '@chakra-ui/react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaGithub, FaLinkedin } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const Contact = () => {
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
            <Stack spacing={8}>
              <VStack spacing={4} align="start">
                <HStack spacing={4}>
                  <Icon as={FaEnvelope} w={6} h={6} color="brand.500" />
                  <Text>rojapinnamraju@gmail.com</Text>
                </HStack>
                <HStack spacing={4}>
                  <Icon as={FaPhone} w={6} h={6} color="brand.500" />
                  <Text>+1 (778) 899-5570</Text>
                </HStack>
              </VStack>

              <VStack spacing={4} align="start">
                <Text fontWeight="bold" fontSize="lg">
                  Connect with me
                </Text>
                <HStack spacing={6}>
                  <Box
                    as="a"
                    href="https://github.com/RojaPinnamraju"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon
                      as={FaGithub}
                      w={6}
                      h={6}
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
                  >
                    <Icon
                      as={FaLinkedin}
                      w={6}
                      h={6}
                      color="gray.600"
                      _hover={{ color: 'brand.500', transform: 'scale(1.1)' }}
                      transition="all 0.2s"
                      cursor="pointer"
                    />
                  </Box>
                </HStack>
              </VStack>
            </Stack>
          </MotionBox>

          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Stack
              spacing={6}
              p={8}
              bg={useColorModeValue('white', 'gray.800')}
              rounded={'xl'}
              boxShadow={'xl'}
            >
              <FormControl id="name">
                <FormLabel>Name</FormLabel>
                <Input
                  type="text"
                  placeholder="Your name"
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                  }}
                />
              </FormControl>
              <FormControl id="email">
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                  }}
                />
              </FormControl>
              <FormControl id="message">
                <FormLabel>Message</FormLabel>
                <Textarea
                  placeholder="Your message"
                  rows={6}
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                  }}
                />
              </FormControl>
              <Button
                colorScheme="brand"
                size="lg"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
              >
                Send Message
              </Button>
            </Stack>
          </MotionBox>
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Contact; 