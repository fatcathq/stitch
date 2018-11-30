import { expect } from 'chai'
import 'mocha'
import { marketIsValid, numberIsDeformed } from '../../utils/helpers'

describe('marketIsValid', () => {
  it('should accept valid markets', () => {
    expect(marketIsValid('ETH/BTC')).to.be.true
    expect(marketIsValid('ETH/USDT')).to.be.true
  })
  it('should reject invalid markets', () => {
    expect(marketIsValid('ETH//BTC')).to.be.false
    expect(marketIsValid('ETH')).to.be.false
  })
})

describe('numberIsDeformed', () => {
  it('should accept valid numbers', () => {
    expect(numberIsDeformed(42)).to.be.false
    expect(numberIsDeformed(3.14159265358979)).to.be.false
  })
  it('should reject invalid numbers', () => {
    expect(numberIsDeformed(3.14159265 * 1e23)).to.be.true
  })
})
