// src/lib/topics.js
// CBC-aligned topic lists per subject, used by Notes & Revision Materials UI.
// Keys match SUBJECTS in src/components/ui.jsx exactly.

export const TOPIC_BANKS = {
  'Mathematics': [
    'Number Operations', 'Fractions and Decimals', 'Algebra and Equations',
    'Geometry and Shapes', 'Measurement and Units', 'Data and Statistics',
    'Ratios and Proportions', 'Percentages', 'Patterns and Sequences',
    'Word Problems', 'Time and Calendar', 'Money and Finance',
  ],
  'Business Studies': [
    'Entrepreneurship', 'Business Planning', 'Marketing Basics',
    'Trade and Commerce', 'Financial Management', 'Production',
    'Banking and Insurance', 'Business Ethics',
  ],
  'English': [
    'Grammar and Punctuation', 'Comprehension', 'Vocabulary and Spelling',
    'Creative Writing', 'Poetry', 'Sentence Structure', 'Parts of Speech',
    'Reading Skills', 'Oral Communication', 'Letter Writing',
  ],
  'Natural Sciences': [
    'Living Things', 'Human Body', 'Plants and Photosynthesis',
    'Matter and Materials', 'Forces and Motion', 'Energy and Light',
    'Electricity and Magnetism', 'Ecosystems', 'Health and Nutrition',
  ],
  'Geography': [
    'Map Reading', 'Weather and Climate', 'Landforms', 'Water Bodies',
    'Vegetation Zones', 'Population Distribution', 'Natural Disasters',
    'Environmental Issues', 'East African Region',
  ],
  'History': [
    'Pre-colonial Africa', 'Colonial Period', 'Independence Movements',
    'Kenyan Heroes', 'World Wars', 'Ancient Civilisations',
    'African Kingdoms', 'Modern Kenya',
  ],
  'Life Orientation': [
    'Personal Hygiene', 'Emotional Intelligence', 'Decision Making',
    'Conflict Resolution', 'Healthy Relationships', 'Goal Setting',
    'Civic Responsibility', 'Financial Literacy',
  ],
  'Technology': [
    'Computer Basics', 'Internet Safety', 'Word Processing', 'Spreadsheets',
    'Programming Concepts', 'Digital Communication', 'Cybersecurity',
  ],
  'Accounting': [
    'Bookkeeping Basics', 'Ledgers and Journals', 'Trial Balance',
    'Financial Statements', 'Budgeting', 'Depreciation',
  ],
  'Physical Sciences': [
    'Matter and Materials', 'Chemical Reactions', 'Forces and Motion',
    'Energy', 'Waves and Sound', 'Electricity and Circuits',
  ],
}

export function topicsFor(subject) {
  return TOPIC_BANKS[subject] || []
}
