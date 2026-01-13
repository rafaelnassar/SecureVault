// Lista de palavras simples em português para recuperação
const wordList = [
  'abacaxi', 'amarelo', 'ancora', 'azulejo', 'banana', 'barco', 'branco', 'bronze',
  'cachorro', 'camelo', 'caneta', 'carro', 'castelo', 'cavalo', 'chave', 'cidade',
  'cobra', 'cogumelo', 'cometa', 'coruja', 'cristal', 'diamante', 'dragao', 'elefante',
  'espelho', 'estrela', 'falcon', 'familia', 'flauta', 'floresta', 'foguete', 'forno',
  'galinha', 'garrafa', 'girassol', 'globo', 'golfo', 'gondola', 'grilo', 'guitarra',
  'horizonte', 'igreja', 'janela', 'jardim', 'jasmim', 'jupiter', 'lagarto', 'lampada',
  'laranja', 'leao', 'limao', 'livro', 'lua', 'macaco', 'manga', 'mapa',
  'mariposa', 'martelo', 'melancia', 'montanha', 'morango', 'navio', 'nebulosa', 'neve',
  'oceano', 'orquestra', 'outono', 'padaria', 'palmeira', 'pantera', 'papagaio', 'pato',
  'pedra', 'peixe', 'piano', 'pirata', 'planeta', 'planta', 'prata', 'primavera',
  'prisma', 'raven', 'relogio', 'rio', 'rocha', 'rosa', 'safira', 'salada',
  'salamandra', 'sapato', 'saturno', 'selva', 'serpente', 'sol', 'sonho', 'tempestade',
  'tigre', 'tomate', 'tornado', 'trovao', 'tucano', 'tulipa', 'universo', 'urso',
  'vaca', 'vampiro', 'veleiro', 'verde', 'violeta', 'vulcao', 'xadrez', 'zebra',
  'zeppelin', 'zodiaco', 'ancora', 'aranha', 'arvore', 'avestruz', 'baleia', 'bandeira'
];

// Gera número aleatório criptograficamente seguro
function getSecureRandomIndex(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export function generateRecoveryWords(count: number = 4): string[] {
  const words: string[] = [];
  const usedIndices = new Set<number>();
  
  while (words.length < count) {
    const index = getSecureRandomIndex(wordList.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      words.push(wordList[index]);
    }
  }
  
  return words;
}

export function validateRecoveryWords(input: string[], stored: string[]): boolean {
  if (input.length !== stored.length) return false;
  
  const normalizedInput = input.map(w => w.toLowerCase().trim());
  const normalizedStored = stored.map(w => w.toLowerCase().trim());
  
  return normalizedInput.every((word, index) => word === normalizedStored[index]);
}
