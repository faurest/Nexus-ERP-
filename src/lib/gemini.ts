export async function getFinancialSuggestions(data: { totalRevenue: number, totalExpenses: number, transactions: any[] }) {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'financial_suggestions',
        context: data
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    const textResult = await response.text();
    try {
      const result = JSON.parse(textResult);
      return result.text || result.raw || "Aucune suggestion disponible.";
    } catch (e) {
      console.warn("Nexus AI JSON Parsing Failed. Response was:", textResult.substring(0, 100));
      return textResult || "Erreur de formatage IA.";
    }
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return "Désolé, l'IA Nexus est indisponible pour le moment. Veuillez réessayer plus tard.";
  }
}
