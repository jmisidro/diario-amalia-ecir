// test-parser.js
import Parser from 'rss-parser';
import dotenv from 'dotenv';

dotenv.config();

const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  customFields: {
    item: ['dc:creator', 'creator', 'author'],
  },
});

const jornais = {
  Expresso: 'https://feeds.feedburner.com/expresso-geral',
  'RTP Noticias': 'https://www.rtp.pt/noticias/rss',
  Público: 'https://feeds.feedburner.com/PublicoRSS',
  Observador: 'https://observador.pt/feed/',
  'Diário de Notícias': 'https://www.dnoticias.pt/rss/pais.xml',
  'Sic Notícias': 'https://feeds.feedburner.com/sicnoticias-ultimas',
};

async function testParser() {
  console.log('=== RSS PARSER TEST ===\n');
  
  for (const [jornalName, url] of Object.entries(jornais)) {
    console.log(`\n📰 Testing: ${jornalName}`);
    console.log(`URL: ${url}`);
    console.log('-'.repeat(50));
    
    try {
      const feed = await parser.parseURL(url);
      
      // Print feed metadata
      console.log('\n📋 FEED METADATA:');
      console.log('Title:', feed.title);
      console.log('Description:', feed.description);
      console.log('Link:', feed.link);
      console.log('Last Build Date:', feed.lastBuildDate);
      console.log('Items count:', feed.items.length);
      
      // Print first 2 items in detail
      console.log('\n📰 FIRST 2 ITEMS (RAW PARSER OUTPUT):');
      feed.items.slice(0, 2).forEach((item, index) => {
        console.log(`\n--- ITEM ${index + 1} ---`);
        console.log(JSON.stringify(item, null, 2));
      });
      
      // Print all available fields in the first item
      if (feed.items.length > 0) {
        console.log('\n🔍 ALL AVAILABLE FIELDS IN FIRST ITEM:');
        const firstItem = feed.items[0];
        Object.keys(firstItem).forEach(key => {
          console.log(`- ${key}: ${typeof firstItem[key]}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Error fetching ${jornalName}:`, error.message);
      console.error('Full error:', error);
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

// Run the test
testParser().catch(console.error);