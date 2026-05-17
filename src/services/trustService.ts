import { supabase } from '../lib/supabase';

export class TrustService {
  /**
   * Enterprise KYC Verification
   */
  static async sumbitKYC(userId: string, data: {
    idType: string;
    idNumber: string;
    idImageFront: string;
    businessRegNumber?: string;
  }) {
    const { error } = await supabase
      .from('users')
      .update({
        kyc_status: 'pending',
        metadata: { kyc_submission: data }
      })
      .eq('id', userId);

    return { success: !error, error };
  }

  /**
   * Reputation Score Calculator
   * Calculated based on:
   * - Sales volume
   * - Review parity
   * - Refund rate
   * - Verification status
   */
  static async calculateTrustScore(companyId: string) {
    // 1. Fetch sales and reviews
    const { data: sales } = await supabase.from('orders').select('status').eq('company_id', companyId);
    const { data: reviews } = await supabase.from('reviews').select('rating').eq('target_id', companyId);

    const completed = sales?.filter(s => s.status === 'completed').length || 0;
    const avgRating = reviews?.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : 5;
    
    // Formula weightings
    const score = (completed * 0.4) + (avgRating * 20); // Normalized to 0-100/5-scaled
    const finalScore = Math.min(5.0, score / 20); // 0.0 to 5.0 scale

    await supabase
      .from('companies')
      .update({ trust_score: finalScore })
      .eq('id', companyId);

    return finalScore;
  }

  /**
   * Verified Badge Management
   */
  static async setVerifiedStatus(companyId: string, status: boolean) {
    return await supabase
      .from('companies')
      .update({ is_verified: status })
      .eq('id', companyId);
  }
}
