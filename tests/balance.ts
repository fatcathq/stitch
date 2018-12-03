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

describe('update', async () => {
  let balanceHandler: Balance
  let mockAPI: any
  const testBalance = {
    ETH: 100,
    BTC: 200,
    USD: 300
  }

  beforeAll(async () => {
    mockAPI = createBalanceAPIMock(testBalance)
    balanceHandler = new Balance(mockAPI)
    await balanceHandler.update()
  })

  test('Balance handler should update balance obj properly', async () => {
    expect(balanceHandler.balance).toEqual(balanceToDecimalValues(testBalance))
  })

  test('Balance handler should call api.fetchBalance once', async () => {
    expect(mockAPI.fetchBalance).toHaveBeenCalledTimes(1)
  })
})

describe('precisions', async () => {
  let balanceHandler: Balance
  let mockAPI: any
  const testBalance = {
    ETH: 0.1234567,
    BTC: 0.1234567,
    USD: 0.1234567
  }
  const precisions = {
    ETH: 2,
    BTC: 10,
  }

  beforeAll(async () => {
    mockAPI = createBalanceAPIMock(testBalance)
    balanceHandler = new Balance(mockAPI)
    await balanceHandler.setPrecisions(precisions)
    await balanceHandler.update()
  })

  test('Balance handler should not cut decimals when there is non existing precision on that unit', () => {
    expect(balanceHandler.balance.USD.toNumber()).toEqual(testBalance.USD)
  })

  test('Balance handler should not cut decimals when precision is bigger than floating points', () => {
    expect(balanceHandler.balance.BTC.toNumber()).toEqual(Number(testBalance.BTC.toPrecision(precisions.BTC)))
  })

  test('Balance handler should cut decimals properly', () => {
    expect(balanceHandler.balance.ETH.toNumber()).toEqual(Number(testBalance.ETH.toPrecision(precisions.ETH)))
  })
})
