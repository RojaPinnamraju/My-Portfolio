import React from 'react';
import { Box, Container, Heading, Text, Button, VStack, HStack, Icon, useColorModeValue, Image, SimpleGrid, Flex } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaGithub, FaLinkedin, FaTwitter, FaCode, FaLaptopCode, FaBrain } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const Home = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Box minH="100vh" position="relative" overflow="hidden">
      {/* Animated Background Pattern */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgImage="url('data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%230ea5e9' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E')"
        opacity={0.5}
        zIndex={0}
        animation="float 20s linear infinite"
      />

      <Container maxW="container.xl" position="relative" zIndex={1}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} py={20}>
          <VStack align="start" spacing={8}>
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Heading
                as="h1"
                size="2xl"
                bgGradient="linear(to-r, brand.500, accent.500)"
                bgClip="text"
                fontWeight="extrabold"
                letterSpacing="tight"
              >
                Roja Pinnamraju
              </Heading>
              <Text fontSize="xl" color={textColor} mt={4} fontWeight="medium">
                Software Engineer | AI Enthusiast | Problem Solver
              </Text>
            </MotionBox>

            <Text fontSize="lg" color={textColor} maxW="600px" lineHeight="tall">
              I am a passionate software engineer with experience in building web applications, 
              AI solutions, and scalable systems. I love solving complex problems and learning new technologies.
            </Text>

            <HStack spacing={4}>
              <Button
                as={RouterLink}
                to="/projects"
                colorScheme="brand"
                size="lg"
                rightIcon={<Icon as={FaCode} />}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
              >
                View Projects
              </Button>
              <Button
                as={RouterLink}
                to="/contact"
                variant="outline"
                size="lg"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
              >
                Contact Me
              </Button>
            </HStack>

            <HStack spacing={6} pt={4}>
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

          <Flex direction="column" gap={6}>
            <MotionBox
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Box
                position="relative"
                w="full"
                h="400px"
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="2xl"
              >
                <Image
                  src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97"
                  alt="Developer workspace"
                  objectFit="cover"
                  w="full"
                  h="full"
                />
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  bottom="0"
                  bgGradient="linear(to-b, transparent, brand.900)"
                  opacity={0.3}
                />
              </Box>
            </MotionBox>

            <SimpleGrid columns={3} spacing={4}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Box
                  p={4}
                  bg={useColorModeValue('white', 'gray.800')}
                  borderRadius="lg"
                  boxShadow="md"
                  textAlign="center"
                >
                  <Icon as={FaCode} w={6} h={6} color="brand.500" mb={2} />
                  <Text fontWeight="medium">Clean Code</Text>
                </Box>
              </MotionBox>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Box
                  p={4}
                  bg={useColorModeValue('white', 'gray.800')}
                  borderRadius="lg"
                  boxShadow="md"
                  textAlign="center"
                >
                  <Icon as={FaLaptopCode} w={6} h={6} color="brand.500" mb={2} />
                  <Text fontWeight="medium">Web Development</Text>
                </Box>
              </MotionBox>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Box
                  p={4}
                  bg={useColorModeValue('white', 'gray.800')}
                  borderRadius="lg"
                  boxShadow="md"
                  textAlign="center"
                >
                  <Icon as={FaBrain} w={6} h={6} color="brand.500" mb={2} />
                  <Text fontWeight="medium">AI Solutions</Text>
                </Box>
              </MotionBox>
            </SimpleGrid>
          </Flex>
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Home; 