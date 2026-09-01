import {
  LLM_PROMPTS,
  API_ENDPOINT,
  AMALIA_VERSION,
  SUMMARY_MAX_TOKENS,
} from './amalia.constants.js';

import { TOPICS } from '../config/constants.js';

// Renders a single article (title + summary) into the text block the LLM
// expects. Shared so token estimation and prompt building stay in sync.
const renderArticle = (article) =>
  `### Título\n${article.title || ''}\n\n### Resumo\n${article.summary || ''}`;

const amaliaGenerateDailySummary = async (news) => {
  try {
    // Convert news array to a string format for the LLM
    const newsText = news.map(renderArticle).join('\n\n---\n\n');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.SUMMARY,
          },
          {
            role: 'user',
            content: `Aqui estão as notícias de hoje:\n\n${newsText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: SUMMARY_MAX_TOKENS,
        repetition_penalty: 1.05,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract the summary text
    const summary = data.choices[0].message.content.trim();
    return summary;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return 'Failed to generate Daily News Summary';
  }
};

const amaliaGenerateDailySummaryBatches = async (news, previousSummary) => {
  try {
    // Convert news array to a string format for the LLM
    const newsText = news.map(renderArticle).join('\n\n---\n\n');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.SUMMARY,
          },
          {
            role: 'user',
            content: `Novas notícias:\n\n${newsText}\n\nResumo anterior para incorporar:\n\n${previousSummary}`,
          },
        ],
        temperature: 0.3,
        max_tokens: SUMMARY_MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract the summary text
    const summary = data.choices[0].message.content.trim();
    return summary;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return 'Failed to generate Daily News Summary';
  }
};

const amaliaGenerateWeeklySummary = async (subjects) => {
  try {
    // Convert subjects array to a string format for the LLM
    const subjectsText = subjects
      .map(
        (subject, index) =>
          `### Título\n${subject.label || ''}`
      )
      .join('\n\n---\n\n');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.WEEKLY_SUMMARY,
          },
          {
            role: 'user',
            content: `Aqui estão os assuntos desta semana: \n\n${subjectsText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
        repetition_penalty: 1.05,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract the summary text
    const summary = data.choices[0].message.content.trim();
    return summary;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return 'Failed to generate Daily News Summary';
  }
};

const amaliaGenerateWeeklySummaryBatches = async (subjects, previousSummary) => {
  try {
    // Convert news array to a string format for the LLM
    const subjectsText = subjects
      .map(
        (subject, index) =>
          `### Título\n${subject.title || ''}`
      )
      .join('\n\n---\n\n');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.SUMMARY,
          },
          {
            role: 'user',
            content: `Novos assuntos:\n\n${subjectsText}\n\nResumo anterior para incorporar:\n\n${previousSummary}`,
          },
        ],
        temperature: 0.3,
        // TODO: Dont like this being hardcoded here
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract the summary text
    const summary = data.choices[0].message.content.trim();
    return summary;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return 'Failed to generate Weekly News Summary';
  }
};

const amaliaCategorizeNews = async (newsText) => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.CATEGORIZATION,
          },
          {
            role: 'user',
            content: `Categoriza esta notícia: "${newsText}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract and clean the response
    const rawResponse = data.choices[0].message.content.trim();

    // Process multiple categories separated by commas
    const categoriesArray = rawResponse
      // Split by comma
      .split(',')
      // Trim whitespace from each category
      .map((cat) => cat.trim())
      // Remove any quotes, extra punctuation
      .map((cat) => cat.replace(/['".,;:!?]+/g, ''));

    // Validate categories are within expected list
    const validCategories = TOPICS;

    // Keep only valid categories
    const validatedArray = categoriesArray.filter((cat) =>
      validCategories.includes(cat)
    );

    // If no valid categories found, return default
    if (validatedArray.length === 0) {
      console.warn(`LLM returned no valid categories from: "${rawResponse}".`);
      return ['Outro'];
    }

    return validatedArray;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return ['Outro']; // Default category on failure
  }
};

const amaliaScoreNews = async (newsText) => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.PUBLIC_INTEREST,
          },
          {
            role: 'user',
            content: `Avalia esta notícia: "${newsText}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract and clean the response
    const rawResponse = data.choices[0].message.content.trim();

    // Parse each score line e.g. "Relevância: 4/5"
    const parseScore = (label) => {
      const match = rawResponse.match(new RegExp(`${label}:\\s*(\\d+)`));
      return match ? parseInt(match[1], 10) : null;
    };

    const scores = {
      relevance: parseScore('Relevância'),
      proximity: parseScore('Proximidade'),
      novelty: parseScore('Novidade'),
      actuality: parseScore('Atualidade'),
      continuity: parseScore('Continuidade'),
      notoriety: parseScore('Notoriedade'),
      negativity: parseScore('Negatividade'),
    };

    // Extract justification
    const justificationMatch = rawResponse.match(/Justificação:\s*(.+)$/s);
    scores.justification = justificationMatch
      ? justificationMatch[1].trim()
      : null;

    // Validate we got all 7 scores
    const missingScores = Object.entries(scores)
      .filter(([key, val]) => key !== 'justification' && val === null)
      .map(([key]) => key);

    if (missingScores.length > 0) {
      console.warn(
        `LLM returned incomplete scoring. Missing: ${missingScores.join(', ')} from: "${rawResponse}".`
      );
      return null;
    }

    return scores;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return null;
  }
};

const amaliaCallDirectChat = async (message, sessionId, newsContext) => {
  try {
    const formattedContext = newsContext
      .map(
        (n, i) =>
          `Notícia [${i + 1}]:\nTítulo: ${n.title}\nConteúdo: ${n.summary}`
      )
      .join('\n\n');

    const prompt = LLM_PROMPTS.DIRECT_QA.replace(
      '{context}',
      formattedContext
    ).replace('{question}', message);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim();

    const mappedReferences = newsContext.map((source, idx) => ({
      id: source.link || source._id || String(idx),
      title: source.title || 'Notícia',
      summary: source.summary,
      source: source.site_name || 'Diário do AMALIA',
      sourceUrl: source.link,
      topics: source.topics
        ? source.topics.map((t) => (typeof t === 'string' ? t : t.name))
        : [],
      publishedAt: source.date || new Date().toISOString(),
      relevanceScore: source.score?.index || 0,
    }));

    return {
      success: true,
      message: answer,
      references: mappedReferences,
    };
  } catch (error) {
    console.error(
      '[LLM ERROR]: Failed to call direct chat API:',
      error.message
    );
    return {
      success: false,
      message:
        'Desculpe, ocorreu um erro ao processar a sua pergunta com o contexto selecionado.',
      references: [],
    };
  }
};

const amaliaLabelTheme = async (newsText) => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.THEME_LABELING,
          },
          {
            role: 'user',
            content: `Aqui vão os assuntos: "${newsText}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 60,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract and clean the response
    // Removes wrapping quotes, asterisks, spaces
    // Removes trailing period if the LLM added one
    const cleanTitle = data.choices[0].message.content
      .trim()
      .replace(/^["'*\s]+|["'*\s]+$/g, '')
      .replace(/\.$/, '');

    return cleanTitle || 'Assunto Geral';
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return 'Assunto Geral';
  }
};

const amaliaExtractParticipants = async (newsText, existingParticipants) => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AMALIA_VERSION,
        messages: [
          {
            role: 'system',
            content: LLM_PROMPTS.PARTICIPANTS,
          },
          {
            role: 'user',
            content: `Notícia: "${newsText}"`,
          },
        ],
        temperature: 0.0,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    // Extract and clean the response
    const rawResponse = data.choices[0].message.content.trim();

    // Process multiple participants separated by commas
    const participantsArray = rawResponse
      // Split by comma
      .split(',')
      // Trim whitespace from each category
      .map((cat) => cat.trim())
      // Remove any quotes, extra punctuation
      .map((cat) => cat.replace(/['".,;:!?]+/g, ''));

    // If no valid participants found, return default
    if (participantsArray.length === 0) {
      console.warn(`LLM returned no valid categories from: "${rawResponse}".`);
      return ['N/A'];
    }

    return participantsArray;
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call LLM API:', error.message);
    return ['N/A']; // Default on failure
  }
};

export {
  renderArticle,
  amaliaGenerateDailySummary,
  amaliaGenerateDailySummaryBatches,
  amaliaGenerateWeeklySummary,
  amaliaGenerateWeeklySummaryBatches,
  amaliaCategorizeNews,
  amaliaScoreNews,
  amaliaCallDirectChat,
  amaliaLabelTheme,
  amaliaExtractParticipants,
};
