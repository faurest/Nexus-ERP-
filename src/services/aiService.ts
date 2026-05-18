/**
 * AIService handles all AI-related interactions for Nexus ERP.
 * It interfaces with the backend Gemini API to provide intelligent features.
 */

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
}

export class AIService {
  private static async callAPI(prompt: string): Promise<AIResponse> {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      
      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.details || `API error: ${response.status}`);
      }

      return {
        content: data.content || data.text || JSON.stringify(data),
        success: true
      };
    } catch (error: any) {
      console.error('AIService Error:', error);
      return {
        content: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Translates a natural language search query into structured search parameters.
   */
  static async intelligentSearch(query: string, availableCategories: string[]): Promise<{
    searchTerm: string;
    category: string;
    reasoning: string;
  }> {
    const prompt = `
      As an expert shopping assistant for Nexus Marketplace in Maroua, Cameroon, analyze this search query: "${query}".
      Available categories: ${availableCategories.join(', ')}.
      
      Extract:
      1. searchTerm: A clean, concise search keyword.
      2. category: The most relevant category from the available list, or "Tous" if not clear.
      3. reasoning: A brief friendly explanation of why you chose these.
      
      Respond only in valid JSON format like:
      {"searchTerm": "...", "category": "...", "reasoning": "..."}
    `;

    const response = await this.callAPI(prompt);
    if (response.success) {
      try {
        return JSON.parse(response.content);
      } catch (e) {
        console.error('Failed to parse AI search response', e);
      }
    }
    return { searchTerm: query, category: "Tous", reasoning: "" };
  }

  /**
   * Generates a descriptive, persuasive product description based on product name and attributes.
   */
  static async enhanceProductDescription(productName: string, category: string): Promise<string> {
    const prompt = `
      Create a persuasive, professional, and culturally appropriate marketing description for a product in Cameroon:
      Product: ${productName}
      Category: ${category}
      Context: Maroua/Grand-Nord market. Focus on durability, value, and practicality.
      Keep it under 3 sentences.
    `;

    const response = await this.callAPI(prompt);
    return response.success ? response.content : "Une qualité supérieure garantie par Nexus ERP.";
  }

  /**
   * Analyzes customer behavior to recommend products.
   */
  static async getRecommendations(cartItems: string[], recentItems: string[]): Promise<string[]> {
    const prompt = `
      Context: User has these items in cart: ${cartItems.join(', ')}.
      Recently viewed: ${recentItems.join(', ')}.
      Suggest 3 additional product categories or items that might interest them in a professional ERP marketplace.
      Respond only with a comma-separated list of 3 items.
    `;

    const response = await this.callAPI(prompt);
    if (response.success) {
      return response.content.split(',').map(s => s.trim());
    }
    return [];
  }
}
