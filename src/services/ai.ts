import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const aiService = {
  async generateExecutiveSummary(data: any) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise os seguintes dados do Instagram e gere um resumo executivo estratégico em Português: ${JSON.stringify(data)}`,
      config: {
        systemInstruction: "Você é um especialista em marketing digital e análise de dados de redes sociais. Seja objetivo, profissional e traga insights acionáveis.",
      }
    });
    const response = await model;
    return response.text;
  },

  async analyzePostPerformance(post: any) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise a performance deste post e sugira melhorias: ${JSON.stringify(post)}`,
      config: {
        systemInstruction: "Foque em engajamento, CTA e qualidade do conteúdo.",
      }
    });
    const response = await model;
    return response.text;
  },

  async classifyComment(commentText: string) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Classifique o sentimento deste comentário do Instagram em uma única palavra (POSITIVE, NEGATIVE, NEUTRAL, QUESTION, SPAM): "${commentText}"`,
    });
    const response = await model;
    return response.text?.trim().toUpperCase();
  },

  async getDeepAccountAnalysis(data: any) {
    const model = ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Realize uma análise profunda (Orquestrador) deste perfil do Instagram com base nos dados reais fornecidos: ${JSON.stringify(data)}.
      
      O relatório deve incluir:
      1. Resumo Geral de Performance.
      2. Estratégia Detalhada para Ganhar Seguidores (baseada no que já funciona).
      3. Melhores Horários para Postar (analise os picos de alcance/engajamento se houver dados, senão sugira com base no nicho).
      4. Sugestões de Conteúdo (Reels, Carrossel, Imagem) com base na performance por tipo.
      5. Plano de Ação para os próximos 30 dias.
      
      Responda em Português Brasileiro, use Markdown para formatação, seja direto e estratégico.`,
      config: {
        systemInstruction: "Você é o 'Orquestrador', um consultor sênior de crescimento no Instagram. Sua missão é transformar dados brutos em um plano de guerra para o sucesso do cliente.",
      }
    });
    const response = await model;
    return response.text;
  }
};
