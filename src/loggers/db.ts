import Opportunity from '../models/opportunity'

export async function logOpportunities (opportunities: Opportunity[]): Promise<void> {
  for (const opportunity of opportunities) {
    await opportunity.save()
  }
}
