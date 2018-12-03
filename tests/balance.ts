import Balance from '../src/models/balance'
import Decimal from 'decimal.js'

const createBalanceAPIMock = (balance: {[key: string]: number}) => {
  return {
    fetchBalance: jest.fn().mockReturnValue({
      free: balance
    })
  }
}

const balanceToDecimalValues = (balance: any) => {
  for (const unit of Object.keys(balance)) {
    balance[unit] = new Decimal(balance[unit])
  }

  return balance
}

test('Update', async () => {
  const testBalance = {
    ETH: 2,
    BTC: 0.2
  }
  const mockAPI = createBalanceAPIMock(testBalance)

  const balanceHandler = new Balance(mockAPI)
  await balanceHandler.update()

  expect(balanceHandler.balance).toEqual(balanceToDecimalValues(testBalance))
  expect(mockAPI.fetchBalance).toHaveBeenCalledTimes(1)
})
