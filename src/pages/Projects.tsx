import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Icon,
  Stack,
  HStack,
  VStack,
  useColorModeValue,
  Badge,
  Image,
  Flex,
} from '@chakra-ui/react';
import { FaReact, FaNodeJs, FaDatabase, FaAws, FaTools, FaCloud, FaMobile, FaGithub, FaExternalLinkAlt, FaBrain, FaCode } from 'react-icons/fa';
import { SiTypescript, SiMongodb, SiPostgresql } from 'react-icons/si';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface FeatureProps {
  title: string;
  text: string;
  icon: React.ElementType;
  demo?: string;
  github?: string;
  image?: string;
  technologies?: string[];
}

const Feature = ({ title, text, icon, demo, github, image, technologies }: FeatureProps) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <Stack
        spacing={4}
        bg={useColorModeValue('white', 'gray.800')}
        rounded={'xl'}
        boxShadow={'xl'}
        overflow="hidden"
        _hover={{
          transform: 'translateY(-5px)',
          transition: 'all 0.3s ease',
        }}
      >
        {image && (
          <Box position="relative" h="200px">
            <Image
              src={image}
              alt={title}
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
        )}
        <Stack p={6} spacing={4}>
          <HStack>
            <Icon
              as={icon}
              w={8}
              h={8}
              color={'brand.500'}
              _hover={{ transform: 'scale(1.1)', transition: 'all 0.2s ease' }}
            />
            <Text fontWeight={600} fontSize="xl">
              {title}
            </Text>
          </HStack>
          <Text color={useColorModeValue('gray.600', 'gray.400')}>{text}</Text>
          
          {technologies && (
            <HStack wrap="wrap" spacing={2}>
              {technologies.map((tech, index) => (
                <Badge key={index} colorScheme="brand" variant="subtle">
                  {tech}
                </Badge>
              ))}
            </HStack>
          )}

          <HStack spacing={4} pt={2}>
            {github && (
              <Box
                as="a"
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                color="brand.500"
                fontWeight="medium"
                _hover={{ color: 'brand.600' }}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Icon as={FaGithub} />
                View Code
              </Box>
            )}
            {demo && (
              <Box
                as="a"
                href={demo}
                target="_blank"
                rel="noopener noreferrer"
                color="brand.500"
                fontWeight="medium"
                _hover={{ color: 'brand.600' }}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Icon as={FaExternalLinkAlt} />
                Live Demo
              </Box>
            )}
          </HStack>
        </Stack>
      </Stack>
    </MotionBox>
  );
};

const Projects = () => {
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
            My Projects
          </Heading>
          <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize={'lg'}>
            Here are some of the projects I've worked on. Each project represents a unique challenge
            and learning experience in my journey as a developer.
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
          <Box data-project="ai-task-planner">
            <Feature
              icon={FaBrain}
              title={'AI Task Planner App'}
              text={
                'Developed an AI-powered task management system using Streamlit and FastAPI that integrates with Groq and OpenAI language models. Implemented a responsive frontend with customizable AI behavior and web search capabilities.'
              }
              demo="https://ai-personnal-advisor.netlify.app/"
              github="https://github.com/RojaPinnamraju/ai-task-planner"
              image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"
              technologies={['Streamlit', 'FastAPI', 'Groq', 'OpenAI', 'Python']}
            />
          </Box>
          <Box data-project="codeedgeai">
            <Feature
              icon={FaCode}
              title={'CodeEdgeAI'}
              text={
                'A modern coding platform with AI-powered tutoring, providing an interactive learning experience for developers.'
              }
              demo="https://codeedgeai.netlify.app/"
              github="https://github.com/RojaPinnamraju/CodeEdgeAI"
              image="https://images.unsplash.com/photo-1531746790731-6c087fecd65a"
              technologies={['Flask', 'JavaScript', 'HTML/CSS', 'Groq API']}
            />
          </Box>
          <Box data-project="job-portal">
            <Feature
              icon={FaDatabase}
              title={'Job Portal'}
              text={
                'Conceptualized and executed a job portal using Java, Spring Boot, MongoDB, React.js, and Swagger UI. Engineered RESTful APIs, and integrated Swagger UI for streamlined testing and documentation.'
              }
              github="https://github.com/RojaPinnamraju/JobPortal"
              image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"
              technologies={['Java', 'Spring Boot', 'MongoDB', 'React.js', 'Swagger UI']}
            />
          </Box>
          <Box data-project="tic-tac-toe">
            <Feature
              icon={FaTools}
              title={'Tic-Tac-Toe Game'}
              text={
                'Designed an AI opponent with an 85% improved winning rate through pattern recognition and learning mechanisms.'
              }
              github="https://github.com/RojaPinnamraju/INFO6205TicTacToe"
              image="https://images.unsplash.com/photo-1553481187-be93c21490a9"
              technologies={['Java', 'AI', 'Pattern Recognition']}
            />
          </Box>
          <Feature
            icon={FaBrain}
            title={'LangChain YouTube Q&A'}
            text={
              'Built a question-answering system using LangChain that processes YouTube video content and provides accurate responses to user queries.'
            }
            github="https://github.com/RojaPinnamraju/LangChain-YoutubeQ-A"
            image="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7"
            technologies={['Python', 'LangChain', 'AI', 'YouTube API']}
          />
          <Feature
            icon={FaMobile}
            title={'Food Recipe App'}
            text={
              'Developed a mobile application for discovering and sharing recipes, featuring a modern UI and seamless user experience.'
            }
            github="https://github.com/RojaPinnamraju/Food-Recipe-App"
            image="https://images.unsplash.com/photo-1504674900247-0877df9cc836"
            technologies={['JavaScript', 'React Native', 'Mobile Development']}
          />
          <Feature
            icon={FaTools}
            title={'Quiz Portal System'}
            text={
              'Created an interactive quiz platform with user authentication, score tracking, and real-time feedback features.'
            }
            github="https://github.com/RojaPinnamraju/QuizPortalSystem"
            image="https://images.unsplash.com/photo-1503676260728-1c00da094a0b"
            technologies={['Java', 'Spring Boot', 'Database', 'Web Development']}
          />
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Projects; 