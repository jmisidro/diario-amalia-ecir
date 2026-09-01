export const JORNAIS = {
  Expresso: 'https://feeds.feedburner.com/expresso-geral',
  'RTP Notícias': 'https://www.rtp.pt/noticias/rss',
  Público: 'https://feeds.feedburner.com/PublicoRSS',
  Observador: 'https://observador.pt/feed/',
  // 'Diário de Notícias Madeira': 'https://www.dnoticias.pt/rss/pais.xml',
  'Diário de Notícias': 'https://www.dn.pt/stories.rss',
  'Sic Notícias': 'https://feeds.feedburner.com/sicnoticias-ultimas',
  'Correio da Manhã': 'https://www.cmjornal.pt/rss',
  // 'Notícias ao Minuto': 'https://www.noticiasaominuto.com/rss/ultima-hora',
};

export const SOURCES = Object.keys(JORNAIS);

// TODO: Add editoriais, artigos de opinião...
export const EXCLUDED_CATEGORIES = [
  'Observador',
  'Opinião',
  'Boa Cama Boa Mesa',
  'Blitz',
];

export const TOPIC_CONFIG = [
  { name: 'Política', icon: 'Gavel', color: 'blue' },
  { name: 'Economia', icon: 'Briefcase', color: 'emerald' },
  { name: 'Internacional', icon: 'Globe', color: 'cyan' },
  { name: 'Saúde', icon: 'HeartPulse', color: 'red' },
  { name: 'Ciência', icon: 'Microscope', color: 'indigo' },
  { name: 'Tecnologia', icon: 'Cpu', color: 'purple' },
  { name: 'Cultura', icon: 'Theater', color: 'pink' },
  { name: 'Ambiente', icon: 'TreePine', color: 'green' },
  { name: 'Desporto', icon: 'Trophy', color: 'orange' },
  { name: 'Sociedade', icon: 'Users', color: 'amber' },
  { name: 'Local', icon: 'MapPin', color: 'slate' },
];

export const TOPICS = TOPIC_CONFIG.map(t => t.name);

// Number of top-scoring subjects fed into the global ("all") daily summary.
export const TOP_SUBJECTS_FOR_SUMMARY = 40;

// In days
export const PARTICIPANTS_OLD_TRESHOLD = 14;

export const CUTOFF_MS = PARTICIPANTS_OLD_TRESHOLD * 24 * 60 * 60 * 1000;

export const DEFAULT_TOPIC = { name: 'Outro', icon: 'Newspaper', color: 'gray' };

export const MOCK_RESPONSE = `Obrigado pela sua pergunta! Como AMALIA, o modelo de linguagem para português europeu,
  posso ajudá-lo a compreender melhor as notícias do dia.
  Hoje temos notícias sobre política, economia, tecnologia e muito mais. Sobre que tema gostaria de saber mais?`;
