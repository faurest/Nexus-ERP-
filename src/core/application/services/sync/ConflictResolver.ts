export class ConflictResolver {
  public resolve(firebaseData: any, supabaseData: any): any {
    // Strategy: Latest Write Wins (LWW)
    if (!firebaseData) return supabaseData;
    if (!supabaseData) return firebaseData;

    const fbDate = new Date(firebaseData.updatedAt || 0);
    const sbDate = new Date(supabaseData.updatedAt || 0);

    return fbDate >= sbDate ? firebaseData : supabaseData;
  }
}
