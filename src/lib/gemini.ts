import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

export const geminiModel = "gemini-3-flash-preview";

export async function getFinancialSuggestions(data: { totalRevenue: number, totalExpenses: number, transactions: any[] }) {
  const prompt = `
    En tant qu'expert en analyse financière pour Nexus ERP, analyse les données financières suivantes et propose 3 à 5 suggestions stratégiques concrètes pour optimiser les flux monétaires.
    
    Données:
    - Recettes Totales: ${data.totalRevenue} FCFA
    - Dépenses Totales: ${data.totalExpenses} FCFA
    - Bénéfice Net: ${data.totalRevenue - data.totalExpenses} FCFA
    - Transactions récentes: ${JSON.stringify(data.transactions.slice(0, 10))}
    
    Réponds en français, avec un ton professionnel et encourageant. Structure ta réponse avec des titres clairs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Désolé, je ne peux pas générer de suggestions pour le moment.";
  }
}
