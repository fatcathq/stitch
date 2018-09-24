import Opportunity from '../models/opportunity'
import config from '../utils/config'

export async function logOpportunities (opportunities: Opportunity[], mock = !config.log.db.enabled): Promise<void> {
  if (mock) {
    return
  }

  for (const opportunity of opportunities) {
    await opportunity.save()
  }
}
