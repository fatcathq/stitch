import { Balance } from '../../src/types'
import BalanceHandler from '../../src/models/balance'
import Decimal from 'decimal.js'

const createBalanceAPIMock = (balance: {[key: string]: number}) => {
  return {
    fetchBalance: jest.fn().mockReturnValue({
      free: balance
    })
  }
}

const balanceToDecimalValues = (balance: any): Balance => {
  for (const unit of Object.keys(balance)) {
    balance[unit] = new Decimal(balance[unit])
  }

  return balance
}

describe('update', async () => {
  test('Balance handler should update balance obj properly', async () => {
    let balanceHandler: BalanceHandler

    const testBalance = {
      ETH: 100,
      BTC: 200,
      USD: 300
    }

    let mockAPI = createBalanceAPIMock(testBalance)
    balanceHandler = new BalanceHandler(mockAPI)
    await balanceHandler.update()

    expect(balanceHandler.balance).toEqual(balanceToDecimalValues(testBalance))
    expect(mockAPI.fetchBalance).toHaveBeenCalledTimes(1)
  })


  test('Balance handler calculates checkpoint differences', async () => {
    let balanceHandler: BalanceHandler

    const testBalanceBegin = {
      ETH: 100,
      BTC: 200,
      USD: 300,
      ADA: 9001
    }
    const testBalanceEnd = {
      ETH: 101,
      BTC: 205.025,
      USD: 297,
      ADA: 9001,
      XMR: 7
    }

    let mockAPI = createBalanceAPIMock(testBalanceBegin)
    balanceHandler = new BalanceHandler(mockAPI)
    await balanceHandler.update()
    let checkpoint = balanceHandler.getCheckpoint()
    mockAPI.fetchBalance.mockReturnValue({free: testBalanceEnd})
    await balanceHandler.update()

    let diff: Balance = balanceHandler.compareWithCheckpoint(checkpoint)

    expect(diff.ETH.toNumber()).toEqual(1)
    expect(diff.BTC.toNumber()).toEqual(5.025)
    expect(diff.USD.toNumber()).toEqual(-3)
    expect(diff.XMR.toNumber()).toEqual(7)
    expect(diff).not.toHaveProperty('ADA')
  })
})

describe('precisions', async () => {
  let balanceHandler: BalanceHandler
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
    balanceHandler = new BalanceHandler(mockAPI)
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
