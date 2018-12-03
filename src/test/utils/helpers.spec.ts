import { marketIsValid, numberIsDeformed } from '../../utils/helpers'

test('marketIsValid', () => {
  expect(marketIsValid('ETH/BTC')).toBe(true)
  expect(marketIsValid('ETH/USDT')).toBe(true)

  expect(marketIsValid('ETH//BTC')).toBe(false)
  expect(marketIsValid('ETH')).toBe(false)
})

test('numberIsDeformed', () => {
  expect(numberIsDeformed(42)).toBe(false)
  expect(numberIsDeformed(3.14159265358979)).toBe(false)

  expect(numberIsDeformed(3.14159265 * 1e23)).toBe(true)
})
