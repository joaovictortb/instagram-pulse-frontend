import { getSupabaseClient } from '../lib/supabase';

/**
 * Dados do time vindos do Supabase (logo, cores, etc.).
 */
export interface ArticleTeam {
  name: string | null;
  abbreviation: string | null;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  conference: string | null;
  division: string | null;
  city: string | null;
}

/**
 * Artigo normalizado para o editor e PostGenerator.
 * Compatível com dados do Supabase (blog) e, se necessário, com ESPN.
 */
export interface Article {
  /** Identificador único (id do Supabase ou dataSourceIdentifier da ESPN). */
  dataSourceIdentifier: string;
  headline: string;
  description: string;
  /** Conteúdo completo da notícia (quando disponível no Supabase). */
  content?: string;
  published: string;
  type?: string;
  premium?: boolean;
  links?: unknown;
  categories: { id?: number; description: string; type?: string }[];
  images: { name?: string; width?: number; height?: number; alt?: string; caption?: string; url: string }[];
  byline?: string;
  /** URL original da notícia (ex.: ESPN). Usado no editor para "Buscar conteúdo". */
  sourceUrl?: string | null;
  /** Dados do time (logo, cores) quando existirem no Supabase. */
  team?: ArticleTeam;
}

/** Linha bruta da tabela articles do Supabase (campos usados na listagem). */
interface SupabaseArticleRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content?: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
  team_name?: string | null;
  team_abbreviation?: string | null;
  team_logo?: string | null;
  team_primary_color?: string | null;
  team_secondary_color?: string | null;
  team_conference?: string | null;
  team_division?: string | null;
  team_city?: string | null;
  source_url?: string | null;
  instagram_published_at?: string | null;
}

const SELECT_FIELDS = [
  'id',
  'title',
  'slug',
  'description',
  'content',
  'image_url',
  'category',
  'published_at',
  'created_at',
  'team_name',
  'team_abbreviation',
  'team_logo',
  'team_primary_color',
  'team_secondary_color',
  'team_conference',
  'team_division',
  'team_city',
  'source_url',
  'instagram_published_at',
] as const;

function mapSupabaseRowToArticle(row: SupabaseArticleRow): Article {
  const imageUrl = row.image_url || 'https://picsum.photos/seed/nfl/800/450';
  const hasTeam =
    row.team_name != null ||
    row.team_abbreviation != null ||
    row.team_logo != null ||
    row.team_primary_color != null;
  return {
    dataSourceIdentifier: row.id,
    headline: row.title,
    description: row.description || '',
    content: row.content || undefined,
    published: row.published_at || row.created_at,
    categories: row.category ? [{ description: row.category }] : [],
    images: [{ url: imageUrl }],
    byline: 'NFL Blog Brasil',
    sourceUrl: row.source_url ?? null,
    team: hasTeam
      ? {
          name: row.team_name ?? null,
          abbreviation: row.team_abbreviation ?? null,
          logo: row.team_logo ?? null,
          primaryColor: row.team_primary_color ?? null,
          secondaryColor: row.team_secondary_color ?? null,
          conference: row.team_conference ?? null,
          division: row.team_division ?? null,
          city: row.team_city ?? null,
        }
      : undefined,
  };
}

/**
 * Busca notícias publicadas do Supabase (blog), ordenadas da mais recente para a mais antiga.
 * Requer `VITE_SUPABASE_URL_STUDIO` + `VITE_SUPABASE_ANON_KEY_STUDIO` (ou fallback `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
 *
 * Esta função traz **todas** as notícias publicadas, independente de já terem sido
 * postadas no Instagram ou não.
 */
export async function fetchNFLNews(limit = 100): Promise<Article[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[editor-post] Supabase não configurado; retornando lista vazia.');
    return [];
  }

  try {
    const selectFields = SELECT_FIELDS.join(',');
    console.log('[editor-post] Supabase query: from("articles").select(', selectFields, ").eq('published', true)");

    const { data, error } = await supabase
      .from("articles")
      .select(selectFields)
      .eq("published", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Log completo do que o Supabase retorna sobre as notícias
    console.log('[editor-post] Supabase fetchNFLNews — resumo:', {
      total: data?.length ?? 0,
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
    });
    if (data?.length) {
      const first = data[0] as unknown as Record<string, unknown>;
      const allKeys = Object.keys(first);
      console.log('[editor-post] Supabase — campos disponíveis na resposta (keys):', allKeys);
      console.log('[editor-post] Supabase — primeiro artigo (raw, todos os campos):', JSON.parse(JSON.stringify(first)));
      const firstTyped = data[0] as unknown as SupabaseArticleRow;
      console.log('[editor-post] Supabase — primeiro artigo (resumo):', {
        id: firstTyped.id,
        title: firstTyped.title,
        slug: firstTyped.slug,
        description: firstTyped.description?.slice(0, 80),
        image_url: firstTyped.image_url,
        category: firstTyped.category,
        published_at: firstTyped.published_at,
        created_at: firstTyped.created_at,
        source_url: firstTyped.source_url,
        instagram_published_at: firstTyped.instagram_published_at,
        team_name: firstTyped.team_name,
        team_abbreviation: firstTyped.team_abbreviation,
        team_logo: firstTyped.team_logo?.slice(0, 60),
        team_primary_color: firstTyped.team_primary_color,
        team_secondary_color: firstTyped.team_secondary_color,
        team_conference: firstTyped.team_conference,
        team_division: firstTyped.team_division,
        team_city: firstTyped.team_city,
      });
      const withSourceUrl = (data as unknown as SupabaseArticleRow[]).filter((r) => r.source_url);
      console.log('[editor-post] Supabase — artigos com source_url:', withSourceUrl.length, withSourceUrl.slice(0, 3).map((r) => ({ id: r.id, title: r.title?.slice(0, 40), source_url: r.source_url })));
    }

    if (error) {
      console.error('[editor-post] Erro ao buscar artigos do Supabase:', error);
      return [];
    }

    if (!data?.length) {
      console.log('[editor-post] Nenhum artigo retornado.');
      return [];
    }

    const mapped = (data as unknown as SupabaseArticleRow[]).map(mapSupabaseRowToArticle);
    console.log('[editor-post] Artigos mapeados (primeiros 2 com sourceUrl):', mapped.slice(0, 2).map((a) => ({ id: a.dataSourceIdentifier, headline: a.headline?.slice(0, 35), sourceUrl: a.sourceUrl })));
    return mapped;
  } catch (err) {
    console.error('[editor-post] Erro ao buscar notícias:', err);
    return [];
  }
}

/**
 * Busca apenas notícias que **ainda não foram publicadas no Instagram**.
 * Critério: `instagram_published_at IS NULL` na tabela `articles`.
 *
 * Útil para filas de postagem / pendentes de publicação.
 */
export async function fetchNFLNewsNotPublishedOnInstagram(
  limit = 100,
): Promise<Article[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      "[editor-post] Supabase não configurado; retornando lista vazia.",
    );
    return [];
  }

  try {
    const selectFields = SELECT_FIELDS.join(",");
    console.log(
      "[editor-post] Supabase query (not published on IG): from(\"articles\").select(",
      selectFields,
      ").eq('published', true).is('instagram_published_at', null)",
    );

    const { data, error } = await supabase
      .from("articles")
      .select(selectFields)
      .eq("published", true)
      .is("instagram_published_at", null)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    console.log("[editor-post] Supabase fetchNFLNewsNotPublishedOnInstagram — resumo:", {
      total: data?.length ?? 0,
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: (error as { details?: string }).details,
          }
        : null,
    });

    if (error) {
      console.error(
        "[editor-post] Erro ao buscar artigos não publicados no Instagram:",
        error,
      );
      return [];
    }

    if (!data?.length) {
      console.log(
        "[editor-post] Nenhum artigo pendente de publicação no Instagram.",
      );
      return [];
    }

    return (data as unknown as SupabaseArticleRow[]).map(mapSupabaseRowToArticle);
  } catch (err) {
    console.error(
      "[editor-post] Erro ao buscar notícias não publicadas no Instagram:",
      err,
    );
    return [];
  }
}

/**
 * Marca o artigo como publicado no Instagram no Supabase.
 * Chamado pelo editor após publicar com sucesso (Feed ou Story).
 * Requer que a migration 005_instagram_published.sql tenha sido aplicada.
 */
export async function markArticleInstagramPublished(articleId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[editor-post] markArticleInstagramPublished: Supabase não configurado');
    return false;
  }
  try {
    console.log('[editor-post] Supabase RPC mark_article_instagram_published — chamando com article_id:', articleId);
    const { data, error } = await supabase.rpc('mark_article_instagram_published', {
      article_id: articleId,
    });
    console.log('[editor-post] Supabase RPC mark_article_instagram_published — resposta:', {
      data,
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
    });
    if (error) {
      console.warn('[editor-post] Erro ao marcar artigo como publicado no Instagram:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[editor-post] Erro ao marcar artigo Instagram:', err);
    return false;
  }
}
