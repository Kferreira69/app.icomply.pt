import * as fs from 'fs';
import * as path from 'path';
import {
  SearchField, fold, highlightRanges, makeSnippet, matchFields, parseQuery, stem, stemsMatch, withinEdits,
} from '../search-text';

const field = (text: string, over: Partial<SearchField> = {}): SearchField => ({
  key: 'title', text, weight: 10, fuzzy: true, ...over,
});

describe('search-text', () => {
  describe('fold / stem', () => {
    it('removes accents and case', () => {
      expect(fold('Formação')).toBe('formacao');
      expect(fold('AÇÃO Ôntica')).toBe('acao ontica');
    });

    it('reduces PT/EN variants of a word to one stem', () => {
      const stems = ['formação', 'formações', 'formar', 'formado', 'formando'].map(w => stem(fold(w)));
      expect(new Set(stems).size).toBe(1);
      expect(stem('training')).toBe(stem('trainings'));
      expect(stem(fold('políticas'))).toBe(stem(fold('política')));
    });

    it('does not treat "form" as the same word as "formulario"', () => {
      expect(stemsMatch('form', 'formulario')).toBe(false);
      expect(stemsMatch('document', 'documento')).toBe(true);
      expect(stemsMatch('audit', 'auditoria')).toBe(true);
    });

    it('measures edits, counting a swap of neighbouring letters as one', () => {
      expect(withinEdits('politca', 'politica', 1)).toBe(true);
      expect(withinEdits('polica', 'politica', 1)).toBe(false);
      expect(withinEdits('polica', 'politica', 2)).toBe(true);
      expect(withinEdits('viedo', 'video', 1)).toBe(true);
    });

    it('does not shrink "qualidade" to the common word "qual"', () => {
      expect(stem('qualidade')).toBe('qualidade');
      expect(stemsMatch(stem('qualidades'), stem('qualidade'))).toBe(true);
      expect(matchFields([field('Qual é o primeiro passo?')], parseQuery('qualidade'))).toBeNull();
    });
  });

  describe('parseQuery', () => {
    it('drops stop-words but keeps the meaningful ones', () => {
      expect(parseQuery('como criar uma política').tokens).toEqual(['criar', 'politica']);
    });

    it('keeps everything when the query is only stop-words', () => {
      expect(parseQuery('de para').tokens.length).toBe(2);
    });

    it('expands the abbreviations people actually type', () => {
      expect(parseQuery('docs').tokens).toEqual(['documentos']);
      expect(parseQuery('SGA').tokens).toEqual(['ambiente']);
      expect(parseQuery('sgq manual').tokens).toEqual(['qualidade', 'manual']);
    });

    it('relates "ambiente" to waste, energy, emissions…', () => {
      expect(parseQuery('ambiente').related).toEqual(
        expect.arrayContaining([stem('residuos'), stem('energia'), stem('emissoes'), stem('ambiental')]),
      );
    });

    it('relates a training query to academy / video / help concepts', () => {
      const q = parseQuery('formação');
      expect(q.related).toEqual(expect.arrayContaining([stem('video'), stem('academia'), stem('tutorial'), stem('ajuda')]));
      expect(q.related).not.toContain(stem('formacao'));
    });
  });

  describe('matchFields', () => {
    it('finds all words, ignoring accents ("exact")', () => {
      const m = matchFields([field('Política de Segurança da Informação')], parseQuery('seguranca informacao'));
      expect(m?.tier).toBe('exact');
    });

    it('is partial when only some words match', () => {
      const m = matchFields([field('Política de Segurança')], parseQuery('politica foguetes'));
      expect(m?.tier).toBe('partial');
    });

    it('returns null when nothing matches, directly or by concept', () => {
      expect(matchFields([field('Gestão de riscos')], parseQuery('xyzzy'))).toBeNull();
      expect(matchFields([field('Formulário de contacto')], parseQuery('formacao'))).toBeNull();
    });

    it('finds words that only occur in free text, with a lower score than a title hit', () => {
      const inTitle = matchFields([field('Plano de formação anual')], parseQuery('formacao'))!;
      const inBody = matchFields(
        [field('Plano anual'), { key: 'content', text: 'A formação dos colaboradores é obrigatória.', weight: 1.5, long: true }],
        parseQuery('formacao'),
      )!;
      expect(inTitle.tier).toBe('exact');
      expect(inBody.tier).toBe('exact');
      expect(inBody.field).toBe('content');
      expect(inTitle.score).toBeGreaterThan(inBody.score);
    });

    it('matches plural / verb forms through the stem', () => {
      expect(matchFields([field('Formações obrigatórias')], parseQuery('formacao'))?.tier).toBe('exact');
      expect(matchFields([field('Auditorias internas')], parseQuery('auditoria'))?.tier).toBe('exact');
    });

    it('still points at the right concept when a word is misspelt', () => {
      expect(parseQuery('viedo').related).toEqual(expect.arrayContaining([stem('tutorial'), stem('academia')]));
      expect(matchFields([field('Vídeo tutorial', { weight: 3, fuzzy: false })], parseQuery('viedo'))?.tier).toBe('related');
    });

    it('tolerates a typo in titles but not in long text', () => {
      expect(matchFields([field('Política de Segurança')], parseQuery('politca'))?.tier).toBe('exact');
      expect(matchFields([field('Política de Segurança')], parseQuery('polica'))?.tier).toBe('exact');
      // in long text a typo is never an "exact" hit (at most it reaches the document by concept)
      expect(
        matchFields([{ key: 'content', text: 'política de segurança', weight: 1.5, long: true }], parseQuery('politca'))?.tier,
      ).not.toBe('exact');
    });

    it('links a concept to related content without calling it exact', () => {
      const video = matchFields([field('Vídeo tutorial', { weight: 3, fuzzy: false })], parseQuery('formacao'));
      expect(video?.tier).toBe('related');
      const exact = matchFields([field('Centro de Formação')], parseQuery('formacao'));
      expect(exact?.tier).toBe('exact');
    });

    it('ranks an exact title above a title that merely contains the word', () => {
      const q = parseQuery('manual');
      const whole = matchFields([field('Manual')], q)!;
      const inside = matchFields([field('Manual da Qualidade 2026')], q)!;
      expect(whole.score).toBeGreaterThan(inside.score);
    });
  });

  describe('highlight / snippet', () => {
    it('highlights the whole accented word for an unaccented query', () => {
      expect(highlightRanges('Formação de Colaboradores', parseQuery('formacao'))).toEqual([[0, 8]]);
    });

    it('builds an excerpt around the first match', () => {
      const text = 'a'.repeat(200) + ' a formação é obrigatória ' + 'b'.repeat(200);
      const s = makeSnippet(text, parseQuery('formacao'));
      expect(s).toContain('formação');
      expect(s.length).toBeLessThan(200);
      expect(s.startsWith('…')).toBe(true);
    });

    it('returns an empty snippet when nothing matches', () => {
      expect(makeSnippet('nada a ver', parseQuery('formacao'))).toBe('');
    });
  });

  // The backend ranks database rows, the frontend ranks pages/help/videos with a copy of
  // this file, and the two lists are merged — they must never drift apart.
  it('is byte-identical to the frontend copy', () => {
    const fe = path.resolve(__dirname, '../../../../frontend/src/lib/search/text.ts');
    if (!fs.existsSync(fe)) return; // e.g. a backend-only Docker context
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    expect(norm(fs.readFileSync(fe, 'utf8'))).toBe(norm(fs.readFileSync(path.resolve(__dirname, '../search-text.ts'), 'utf8')));
  });
});
