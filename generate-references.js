// Script to generate reference entries
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Categories from existing data
const categories = [
  'programming',
  'design',
  'research',
  'tools'
];

// Tags from existing data, plus some new ones
const allTags = [
  'javascript', 'ui/ux', 'algorithm', 'database', 'frontend',
  'backend', 'mobile', 'productivity', 'tools', 'data',
  'visualization', 'design', 'development', 'performance',
  'ai', 'blockchain', 'security', 'research',
  'python', 'css', 'html', 'node.js', 'react', 'vue', 'angular',
  'accessibility', 'devops', 'testing', 'cloud', 'api',
  'graphql', 'cms', 'seo', 'typography', 'animation', 'color-theory',
  'machine-learning', 'data-science', 'statistics', 'nlp',
  'iot', 'serverless', 'linux', 'git', 'docker', 'kubernetes'
];

// Various Unsplash image URLs
const thumbnails = [
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1568952433726-3896e3881c65?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1562813733-b31f71025d54?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1543286386-713bdd548da4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1610563166150-b34df4f3bcd6?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80'
];

// Title templates
const titleTemplates = [
  "Guide to {subject} Development",
  "Advanced {subject} Techniques",
  "Introduction to {subject} Design",
  "Essential {subject} Concepts",
  "Mastering {subject} Architecture",
  "Modern {subject} Frameworks",
  "Effective {subject} Patterns",
  "Optimizing {subject} Performance",
  "Building {subject} Applications",
  "Innovative {subject} Solutions",
  "{subject} Best Practices",
  "Understanding {subject} Systems",
  "Practical {subject} Implementation",
  "Exploring {subject} Technologies",
  "Future of {subject} Development",
  "Complete {subject} Reference Guide",
  "{subject} for Beginners",
  "{subject} Design Patterns",
  "{subject} Security Fundamentals",
  "{subject} Research Methods"
];

// Subject words
const subjects = [
  'Frontend', 'Backend', 'Web', 'Mobile', 'UX', 'UI', 'API',
  'Database', 'JavaScript', 'React', 'Node.js', 'Python',
  'DevOps', 'Microservice', 'Cloud', 'Serverless', 'Testing',
  'Security', 'Performance', 'Design System', 'Typography',
  'Color', 'Layout', 'Animation', 'Responsive', 'Figma',
  'CSS', 'HTML', 'SASS', 'GraphQL', 'Machine Learning',
  'Data Visualization', 'Analytics', 'Blockchain', 'AI',
  'Deep Learning', 'IoT', 'Robotics', 'Full Stack', 'Git',
  'Docker', 'Kubernetes', 'SEO', 'Accessibility', 'i18n',
  'Product Design', 'User Research', 'Information Architecture'
];

// Description templates
const descriptionTemplates = [
  "A comprehensive guide to {subject} that covers everything from basic principles to advanced techniques.",
  "Learn practical {subject} skills through real-world examples and case studies.",
  "Explore the latest trends and best practices in {subject} development.",
  "This reference provides in-depth information about {subject} with practical applications.",
  "A detailed exploration of {subject} patterns and architecture for modern applications.",
  "Master the fundamentals of {subject} through step-by-step tutorials and exercises.",
  "Discover effective strategies for implementing {subject} in production environments.",
  "A curated collection of {subject} resources, tools, and methodologies.",
  "Advanced techniques for optimizing {subject} performance and scalability.",
  "Understanding the core concepts behind {subject} with practical implementation guides."
];

// Creator options
const creators = ['admin', 'curator'];

// Random helpers
const getRandomItem = arr => arr[Math.floor(Math.random() * arr.length)];
const getRandomTags = () => {
  const numTags = Math.floor(Math.random() * 3) + 1; // 1 to 3 tags
  const tags = new Set();
  while (tags.size < numTags) {
    tags.add(getRandomItem(allTags));
  }
  return Array.from(tags);
};
const getRandomLoveCount = () => Math.floor(Math.random() * 10);
const getRandomLovedBy = (count) => {
  const lovedBy = [];
  for (let i = 0; i < count; i++) {
    lovedBy.push(Math.floor(Math.random() * 10) + 1); // User IDs 1-10
  }
  return lovedBy;
};

// Generate a random date within the last month
const getRandomDate = () => {
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - Math.floor(Math.random() * 30)); // Random day in the last month
  return pastDate.toISOString();
};

// Generate a reference
const generateReference = (index) => {
  const subject = getRandomItem(subjects);
  const title = getRandomItem(titleTemplates).replace('{subject}', subject);
  const description = getRandomItem(descriptionTemplates).replace('{subject}', subject);
  const category = getRandomItem(categories);
  const tags = getRandomTags();
  const loveCount = getRandomLoveCount();
  const createdAt = getRandomDate();
  
  return {
    title,
    link: `https://example.com/${subject.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    description,
    category,
    tags,
    thumbnail: getRandomItem(thumbnails),
    loveCount,
    lovedBy: getRandomLovedBy(loveCount),
    createdBy: getRandomItem(creators),
    id: uuidv4(),
    createdAt,
    updatedAt: createdAt
  };
};

// Main function to generate references
const generateReferences = (count) => {
  // Read existing references
  const referencesFile = fs.readFileSync('./data/references.json', 'utf8');
  const referencesData = JSON.parse(referencesFile);
  
  // Generate new references
  const newReferences = [];
  for (let i = 1; i <= count; i++) {
    newReferences.push(generateReference(i));
  }
  
  // Combine with existing references
  const updatedReferences = {
    references: [...newReferences, ...referencesData.references]
  };
  
  // Write back to the file
  fs.writeFileSync('./data/references.json', JSON.stringify(updatedReferences, null, 2), 'utf8');
  
  console.log(`Generated ${count} new references, total: ${updatedReferences.references.length}`);
};

// Generate 100 references
generateReferences(100);