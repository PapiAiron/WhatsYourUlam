export const BRAND = {
  name: "What's your ulam",
  shortName: "What's your ulam",
  tagline: "Tell us your budget. We'll plan your meals.",
  subTagline: 'Everyday home-cooked meals planned around local market prices.',
  adminEmail: 'mcantal22@gmail.com',
  adminEmails: ['mcantal22@gmail.com', 'cantal2227@gmail.com'] as const,
  supportEmail: 'cantal2227@gmail.com',
  domain: 'ComingSoon',
  version: '1.0.0',
} as const;

export const DEVELOPER = {
  name: 'Mark Airon Cantal',
  initials: 'MC',
  role: 'Main Developer · Full-Stack & Shopify Developer',
  degree: 'BS Computer Science – Major in Data Science (Laguna University)',
  bio: 'Builds full-stack systems, Shopify storefronts, and AI-driven workflows - clean on the surface, solid underneath. Combines technical problem-solving, thoughtful UI/UX, and real-world data science to solve everyday problems.',
  portfolioUrl: 'https://markaironcantal.site/',
  email: 'cantal2227@gmail.com',
  phoneLocal: '09761386092',
  phoneDisplay: '+63 976 138 6092',
  whatsappUrl: 'https://wa.me/639761386092',
  viberUrl: 'viber://chat?number=%2B639761386092',
  // Drop your portrait image file in /public/assets/ and set imageUrl to '/assets/your-photo.jpg'
  imageUrl: '',
  skills: [
    'React',
    'TypeScript',
    'Vite',
    'Firebase',
    'Python & Data Science',
    'Shopify & Liquid',
    'AI Automation',
    'UI/UX Design',
  ],
  highlights: [
    {
      name: 'TALA.Sys',
      summary: 'Enterprise operations, deployments, and inventory control system (React, TypeScript, Firebase).',
    },
    {
      name: '3N8Analytics',
      summary: 'Causal supply-chain demand forecasting engine for beverage distribution nodes.',
    },
    {
      name: 'Botani-Snap AI',
      summary: 'Real-time visual plant identification & care assistant built with React, Python, and AI models.',
    },
    {
      name: "Ad to Cart & Rich People's Closet",
      summary: 'Custom-themed Shopify & Liquid e-commerce storefronts built for conversion and on-page SEO.',
    },
  ],
} as const;
