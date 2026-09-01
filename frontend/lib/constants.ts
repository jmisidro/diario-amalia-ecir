export const SOURCE_LOGOS: Record<string, { dark: string; light: string } | string> = {
  "Expresso": "/assets/news-agencies/logo_expresso.png",
  "RTP Notícias":  {
    dark: "/assets/news-agencies/logo_rtp_negativo.png",
    light: "/assets/news-agencies/logo_rtp_positivo.png",
  },
  "Público": "/assets/news-agencies/logo_publico.png",
  "Observador": {
    dark: "/assets/news-agencies/logo_observador_negativo.png",
    light: "/assets/news-agencies/logo_observador_positivo.png",
  },
  "Diário de Notícias": {
    dark: "/assets/news-agencies/logo_dn_negativo.png",
    light: "/assets/news-agencies/logo_dn_positivo.png",
  },
  "Sic Notícias": "/assets/news-agencies/logo_sic.png",
  "Correio da Manhã": "/assets/news-agencies/logo_cm.png",
  "Notícias ao Minuto": "/assets/news-agencies/logo_nm.png",
};

export const SOURCE_LOGO_SCALE: Record<string, number> = {
  "Diário de Notícias": 0.65,
  "Expresso": 0.75,
  "Notícias ao Minuto": 0.5,
};

export const SUGGESTIONS = [
  "Quais foram as principais notícias de hoje?",
  "Resume as notícias sobre tecnologia.",
  "O que aconteceu na política hoje?",
  "Quais são as notícias sobre economia?",
];

export const MAX_INDEX = 45;
