import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  Icon,
  useColorModeValue,
  Image,
  Flex,
  VStack,
  HStack,
  Progress,
  Badge,
} from '@chakra-ui/react';
import { FaCode, FaServer, FaDatabase, FaTools, FaCloud, FaMobile, FaBrain, FaReact, FaNodeJs, FaPython, FaJava } from 'react-icons/fa';
import { SiTypescript, SiJavascript, SiMongodb, SiPostgresql, SiMysql } from 'react-icons/si';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface FeatureProps {
  title: string;
  text: string;
  icon: React.ElementType;
}

interface SkillProps {
  name: string;
  level: number;
  icon: React.ElementType;
}

const Feature = ({ title, text, icon }: FeatureProps) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <Stack
        spacing={4}
        p={6}
        bg={useColorModeValue('white', 'gray.800')}
        rounded={'xl'}
        boxShadow={'xl'}
        _hover={{
          transform: 'translateY(-5px)',
          transition: 'all 0.3s ease',
        }}
      >
        <Icon
          as={icon}
          w={10}
          h={10}
          color={'brand.500'}
          _hover={{ transform: 'scale(1.1)', transition: 'all 0.2s ease' }}
        />
        <Text fontWeight={600} fontSize="lg">
          {title}
        </Text>
        <Text color={useColorModeValue('gray.600', 'gray.400')}>{text}</Text>
      </Stack>
    </MotionBox>
  );
};

const Skill = ({ name, level, icon }: SkillProps) => {
  return (
    <MotionBox
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <Stack spacing={2}>
        <HStack>
          <Icon as={icon} color="brand.500" />
          <Text fontWeight="medium">{name}</Text>
        </HStack>
        <Progress
          value={level}
          size="sm"
          colorScheme="brand"
          borderRadius="full"
          bg={useColorModeValue('gray.100', 'gray.700')}
        />
      </Stack>
    </MotionBox>
  );
};

const About = () => {
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
            About Me
          </Heading>
          <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize={'lg'}>
            I'm a passionate Software Engineer with expertise in AI, web development, and problem-solving.
            I love creating innovative solutions that make a real impact.
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} mb={16}>
          <VStack spacing={6} align="start">
            <Heading size="lg">My Journey</Heading>
            <Text color={useColorModeValue('gray.600', 'gray.400')}>
              As a software engineer, I've focused on developing AI-powered applications and web solutions.
              My journey in tech has been driven by a passion for innovation and a desire to create
              meaningful tools that help people.
            </Text>
            <Text color={useColorModeValue('gray.600', 'gray.400')}>
              I specialize in building intelligent applications that combine modern web technologies
              with AI capabilities. My approach combines technical expertise with a strong focus
              on user experience and practical problem-solving.
            </Text>
          </VStack>

          <Flex justify="center" align="center">
            <Box
              position="relative"
              w="full"
              h="400px"
              borderRadius="2xl"
              overflow="hidden"
              boxShadow="2xl"
            >
              <Image
                src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8"
                alt="Developer at work"
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
          </Flex>
        </SimpleGrid>

        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
          <Heading size="lg">Technical Skills</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.400')}>
            Here are some of the technologies and tools I work with
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10} mb={16}>
          <Skill name="Python" level={90} icon={FaPython} />
          <Skill name="Java" level={85} icon={FaJava} />
          <Skill name="JavaScript" level={90} icon={SiJavascript} />
          <Skill name="React" level={85} icon={FaReact} />
          <Skill name="MySQL" level={80} icon={SiMysql} />
          <Skill name="MongoDB" level={75} icon={SiMongodb} />
        </SimpleGrid>

        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
          <Heading size="lg">Areas of Expertise</Heading>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
          <Feature
            icon={FaCode}
            title={'Frontend Development'}
            text={
              'Expertise in React, TypeScript, and modern CSS frameworks. Building responsive and interactive user interfaces.'
            }
          />
          <Feature
            icon={FaServer}
            title={'AI & Machine Learning'}
            text={
              'Experience in developing AI applications, natural language processing, and machine learning solutions.'
            }
          />
          <Feature
            icon={FaDatabase}
            title={'Backend Development'}
            text={
              'Proficient in Node.js, Express, and server-side technologies. Creating robust and scalable APIs.'
            }
          />
          <Feature
            icon={FaTools}
            title={'Problem Solving'}
            text={
              'Strong analytical skills and experience in developing efficient algorithms and data structures.'
            }
          />
          <Feature
            icon={FaCloud}
            title={'Web Technologies'}
            text={
              'Experience with modern web technologies, RESTful APIs, and cloud services for scalable applications.'
            }
          />
          <Feature
            icon={FaMobile}
            title={'Full Stack Development'}
            text={
              'End-to-end development of web applications, from frontend to backend, with a focus on user experience.'
            }
          />
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default About; 