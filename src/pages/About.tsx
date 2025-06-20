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

interface ExperienceProps {
  title: string;
  company: string;
  period: string;
  description: string[];
}

interface EducationProps {
  degree: string;
  school: string;
  period: string;
  details: string[];
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
      className="skill"
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

const Experience = ({ title, company, period, description }: ExperienceProps) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      mb={6}
      className="experience"
    >
      <Stack spacing={2}>
        <Heading size="md" className="title">{title}</Heading>
        <Text fontWeight="bold" color="brand.500" className="company">{company}</Text>
        <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="sm" className="period">{period}</Text>
        <VStack align="start" spacing={2} className="description">
          {description.map((item, index) => (
            <Text key={index} color={useColorModeValue('gray.600', 'gray.400')}>
              • {item}
            </Text>
          ))}
        </VStack>
      </Stack>
    </MotionBox>
  );
};

const Education = ({ degree, school, period, details }: EducationProps) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      mb={6}
      className="education"
    >
      <Stack spacing={2}>
        <Heading size="md" className="degree">{degree}</Heading>
        <Text fontWeight="bold" color="brand.500" className="school">{school}</Text>
        <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="sm" className="period">{period}</Text>
        <VStack align="start" spacing={2} className="details">
          {details.map((item: string, index: number) => (
            <Text key={index} color={useColorModeValue('gray.600', 'gray.400')}>
              • {item}
            </Text>
          ))}
        </VStack>
      </Stack>
    </MotionBox>
  );
};

const About: React.FC = () => {
  return (
    <Box py={20} bg={useColorModeValue('gray.50', 'gray.900')}>
      <Container maxW="container.xl">
        <Stack spacing={8} align="center" textAlign="center" mb={16}>
          <Heading size="2xl">About Me</Heading>
          <section data-section="about">
            <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize={'lg'} maxW="3xl" mx="auto">
              I am a Software Engineer and AI enthusiast with a passion for building innovative solutions. My journey in technology has been driven by a desire to create impactful software that makes a difference.
            </Text>
          </section>
        </Stack>

        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
          <Heading size="lg">Professional Experience</Heading>
        </Stack>

        <Container maxW="container.xl" mb={16}>
          <section data-section="experience">
            <VStack spacing={8} align="stretch">
              <Experience
                title="Software Engineer"
                company="Hack For LA"
                period="Aug 2024 – Present"
                description={[
                  "Leveraged JavaScript, HTML, and CSS to refine frontend interfaces, ensuring content was clear and user-friendly.",
                  "Produced well-structured, maintainable code and actively engaged in code reviews to uphold development standards.",
                  "Built and maintained backend services using Python and Django, enabling smooth interaction with frontend systems."
                ]}
              />
              <Experience
                title="Software Engineer Intern"
                company="Ekotrope"
                period="April 2024 – Aug 2024"
                description={[
                  "Developed integration workflows between BEAM and Ekotrope platforms using JavaScript and Google Scripts.",
                  "Streamlined data synchronization processes to enhance project management efficiency.",
                  "Advanced integration processes to support project tracking and analysis."
                ]}
              />
              <Experience
                title="Instructional Assistant"
                company="Northeastern University"
                period="Aug 2023 – Dec 2023"
                description={[
                  "Assisted in enhancing the CSYE 6500: Cryptocurrency and Smart Contracts course by conducting office hours and interactive classroom discussions.",
                  "Evaluated assignments and provided feedback to improve student understanding of course material."
                ]}
              />
              <Experience
                title="Software Engineer Intern"
                company="Cloudtaru Infotech Pvt Ltd"
                period="May 2022 – Sep 2022"
                description={[
                  "Led the development of a Common Portal using Angular and Node.js, enhancing user satisfaction through improved functionality and a seamless interface.",
                  "Conducted comprehensive automation testing with Selenium to ensure reliability.",
                  "Designed and implemented a PostgreSQL database, optimizing data management processes and improving query performance."
                ]}
              />
            </VStack>
          </section>
        </Container>

        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
          <Heading size="lg">Education</Heading>
        </Stack>

        <Container maxW="container.xl" mb={16}>
          <section data-section="education">
            <VStack spacing={8} align="stretch">
              <Education
                degree="Master of Science in Software Engineering Systems"
                school="Northeastern University"
                period="2022 - 2023"
                details={[
                  "Pursued a Master's degree in Software Engineeringe Engineerinng at Northeastern University, focusing on Software Engineering and Artificial Intelligence.",
                  "Relevant Coursework: Data Structures, Algorithms, Software Engineering, Object Oriented Programming, Web Development, Database Management Systems",
                  "GPA: 3.8/4.0"
                ]}
              />
              <Education
                degree="Bachelor of Technology in Computer Science"
                school="JNTUK"
                period="2016 - 2020"
                details={[
                  "GPA: 8.0/10"
                ]}
              />
            </VStack>
          </section>
        </Container>

        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
          <Heading size="lg">Technical Skills</Heading>
        </Stack>

        <Container maxW="container.xl" mb={16}>
          <section data-section="skills">
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              <Skill name="React" level={90} icon={FaReact} />
              <Skill name="Node.js" level={85} icon={FaNodeJs} />
              <Skill name="TypeScript" level={80} icon={SiTypescript} />
              <Skill name="JavaScript" level={90} icon={SiJavascript} />
              <Skill name="Python" level={85} icon={FaPython} />
              <Skill name="Java" level={75} icon={FaJava} />
              <Skill name="MongoDB" level={80} icon={SiMongodb} />
              <Skill name="PostgreSQL" level={75} icon={SiPostgresql} />
              <Skill name="MySQL" level={70} icon={SiMysql} />
            </SimpleGrid>
          </section>
        </Container>

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