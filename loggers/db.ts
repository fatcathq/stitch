import Opportunity from '../models/opportunity'

export function logOpportunities (opportunities: Opportunity[]): void {
  for (const opportunity of opportunities) {
    opportunity.save()
  }
}
