# Plano de melhorias — InstaPulse (página a página)

**Objetivo do produto:** painel com o **máximo de dados reais** da conta Instagram + **IA** para relatórios e **próximos passos** claros (seguidores, curtidas, comentários).

**Problema hoje:** várias telas se sobrepõem (Painel vs Análise vs Conteúdo), parte do texto promete IA que não existe, e **Relatórios** ainda é mock.

---

## Visão geral — como reorganizar (fase 0)

| Fase | Ação |
|------|------|
| **0.1** | Renomear mentalmente: **Visão geral** (Painel) = KPIs + gráficos + 1 bloco “próximo passo”. **Profundidade** = Análise/Conteúdo com filtros de data iguais ao Painel. |
| **0.2** | **Um único filtro de datas global** (já existe no store) em **todas** as páginas que usam métricas. |
| **0.3** | **Um “hub” de IA:** explicar na sidebar: *Resumo (Painel)*, *Estratégia crescimento (Growth)*, *Plano 30 dias (Orquestrador)* — evitar sensação de 3 coisas iguais. |
| **0.4** | **Relatórios** = listar o que está no Supabase (`ai_reports`) + exportar Markdown/PDF depois. |

---

## 1. Painel (`/dashboard`)

**Papel desejado:** “Como estou neste período?” + síntese + ações rápidas.

**Hoje:** KPIs e gráficos via **Supabase** (após sync); resumo IA **só com botão** (cache OK); hero com conta via **API direta**.

**Melhorias sugeridas (ordem):**

| Prioridade | Melhoria |
|------------|----------|
| P0 | Bloco fixo **“Próximos 3 passos”** (pode vir do último relatório IA ou checklist baseado em regras: ex. “sem sync há X dias”). |
| P0 | Mostrar **estado dos dados**: “Último sync: …” / “KPIs até …” para não parecer bug quando está 0. |
| P1 | **Mini-tabela** “posts que mais engajaram no período” (já dá para montar com `instagram_media` + insights no intervalo). |
| P1 | Alinhar **Insight de IA** do topo com o mesmo texto/cache do card grande (ou remover duplicata). |
| P2 | Alertas simples: queda de alcance vs período anterior. |

---

## 2. Análise (`/analytics`)

**Papel desejado:** tabela detalhada por post (métricas reais, export).

**Hoje:** `account` + `media` via API (últimos N com insights embutidos no endpoint). Botões **Exportar CSV** / **Atualizar** **não fazem nada** útil ainda.

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | **Filtro de data** igual ao Painel; buscar mídia do intervalo (API ou Supabase). |
| P0 | Colunas reais: alcance, impressões/views, salvamentos, tipo, data — o que a Meta/Supabase permitir. |
| P1 | **Exportar CSV** implementado (client-side a partir dos dados carregados). |
| P1 | “Atualizar” = invalidar queries ou disparar sync seletivo de mídia. |
| P2 | Ordenação por coluna, busca funcional. |

---

## 3. Conteúdo (`/content`)

**Papel desejado:** biblioteca visual + performance rápida por card.

**Hoje:** mesma base que Análise (conta + lista media API). “Novo Post” não publica no Instagram.

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | **Mesmo intervalo de datas** + badge “dados de … até …”. |
| P1 | Por card: **insights** (reach, saves…) se existirem no objeto; senão “rodar sync”. |
| P1 | Remover ou renomear **Novo Post** → “Abrir Instagram” (link) até existir API de publicação. |
| P2 | Filtro por tipo (Reels / Feed / Carrossel). |

---

## 4. Comentários (`/comments`)

**Papel desejado:** priorizar respostas que geram mais engajamento + (futuro) IA por comentário.

**Hoje:** comentários **reais** (últimos posts). Filtros de sentimento são **só UI** (não filtram).

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | Filtros funcionais: pelo menos **todos / com pergunta / contém @** (heurística em texto). |
| P1 | **Sugestão de resposta com IA** por comentário (botão = 1 chamada OpenAI), com cache opcional. |
| P2 | Classificação sentimento (OpenAI ou regras) + métrica “tempo médio até resposta” (precisa armazenar respostas — futuro). |

---

## 5. Público (`/audience`)

**Papel desejado:** quem é a audiência (idade, cidade, país…) para adaptar conteúdo.

**Hoje:** `audience` insights via API (`/api/instagram/audience`). Pode falhar ou vir vazio em contas pequenas.

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | Mensagens claras quando Meta **não devolve** demográficos (<100 seguidores, etc.). |
| P1 | Persistir snapshot de audiência no Supabase no **sync** (histórico). |
| P2 | Comparar dois períodos (evolução). |

---

## 6. Crescimento IA (`/growth-ai`)

**Papel desejado:** relatório estratégico focado em **crescimento** (o que fazer).

**Hoje:** cache + botão gerar; parte do texto lateral ainda é **genérico/fixture**.

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | Substituir cards genéricos por **dados reais** (ex.: melhor tipo de mídia no período) ou remover. |
| P1 | Mostrar **data do último relatório** e trecho “executivo” no topo. |
| P2 | Ligação com Painel: link “Ver métricas deste período no Painel”. |

---

## 7. Orquestrador (`/orchestrator`)

**Papel desejado:** **plano de ~30 dias** + prioridades (o “consultor”).

**Hoje:** geração sob demanda; **cache** ao abrir se já existir no Supabase.

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | Texto na tela explicando **diferença** vs Growth IA vs Resumo do Painel. |
| P1 | Após gerar: **checklist extraível** (parse markdown ou segunda chamada estruturada JSON). |
| P2 | Salvar versões nomeadas no `ai_reports` + listar em Relatórios. |

---

## 8. Relatórios (`/reports`)

**Papel desejado:** histórico de **tudo** que a IA gerou + export.

**Hoje:** lista **hardcoded** (fake). É a maior fonte de confusão.

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | **Listar `ai_reports` do Supabase** (tipo, período, data, preview). |
| P1 | Abrir markdown em modal / página. |
| P2 | Export PDF (lib ou print otimizado). |

---

## 9. Configurações (`/settings`)

**Papel desejado:** status real das integrações + links úteis.

**Hoje:** mostra conta; “ATIVO” é **fixo** (não reflete erro de token).

**Melhorias:**

| Prioridade | Melhoria |
|------------|----------|
| P0 | Usar **`/api/health`** (ou equivalente) para Meta + Supabase + OpenAI. |
| P1 | Instruções curtas: token, IDs, sync obrigatório para KPIs. |
| P2 | Botão “Testar conexão Instagram”. |

---

## Ordem sugerida de implementação (sprints curtos)

1. **Relatórios reais** (Supabase) + **Settings com health real** — ganho de confiança rápido.  
2. **Análise:** datas + CSV + dados alinhados ao Painel.  
3. **Comentários:** filtros reais + 1 botão IA por comentário.  
4. **Painel:** último sync + “3 próximos passos”.  
5. **Conteúdo / Público / Growth / Orquestrador:** polimento e remoção de texto enganoso.  

---

## Mapa mental para você

```
Dados brutos Meta  →  Sync  →  Supabase  →  Painel / Análise / Gráficos
                                    ↓
              IA só sob demanda  →  ai_reports  →  Relatórios + caches por página
```

Se quiser, na próxima mensagem diga **por qual página começamos** (recomendo **Relatórios** ou **Configurações**) que implementamos o P0 dessa página primeiro.
