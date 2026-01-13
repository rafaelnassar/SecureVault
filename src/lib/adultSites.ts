// Lista de domínios de sites adultos conhecidos para detecção de conteúdo sensível
const ADULT_DOMAINS = [
  'pornhub',
  'xvideos',
  'xnxx',
  'xhamster',
  'redtube',
  'youporn',
  'tube8',
  'spankbang',
  'brazzers',
  'onlyfans',
  'fansly',
  'chaturbate',
  'livejasmin',
  'stripchat',
  'cam4',
  'bongacams',
  'myfreecams',
  'camsoda',
  'manyvids',
  'clips4sale',
  'naughtyamerica',
  'realitykings',
  'bangbros',
  'mofos',
  'digitalplayground',
  'wicked',
  'evilangel',
  'blacked',
  'tushy',
  'vixen',
  'hegre',
  'metart',
  'femjoy',
  'sexart',
  'eroticbeauties',
  'playboy',
  'penthouse',
  'hustler',
  'adulttime',
  'fakehub',
  'teamskeet',
  'mylf',
  'badoink',
  'virtualrealporn',
  'sexlikereal',
  'pornhd',
  'hqporner',
  'eporner',
  'tnaflix',
  'drtuber',
  'txxx',
  'hclips',
  'porntrex',
  'beeg',
  'motherless',
  'ashemaletube',
  'shemale',
  'trannytube',
  'rule34',
  'e621',
  'gelbooru',
  'danbooru',
  'sankaku',
  'nhentai',
  'hentaihaven',
  'hanime',
  'hentai',
  'xxx',
  'porn',
  'adult',
  'sex',
  '18+',
];

// Palavras-chave que indicam conteúdo adulto no domínio
const ADULT_KEYWORDS = [
  'porn',
  'xxx',
  'adult',
  'nsfw',
  'hentai',
  'sex',
  'erotic',
  'nude',
  'naked',
  'fetish',
  'cam',
  'escort',
  'strip',
];

/**
 * Verifica se um site é considerado adulto baseado no domínio
 */
export function isAdultSite(url: string): boolean {
  try {
    // Normaliza o URL
    const normalized = url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    // Verifica se o domínio está na lista de sites adultos
    for (const domain of ADULT_DOMAINS) {
      if (normalized.includes(domain)) {
        return true;
      }
    }
    
    // Verifica se o domínio contém palavras-chave de conteúdo adulto
    for (const keyword of ADULT_KEYWORDS) {
      if (normalized.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}
