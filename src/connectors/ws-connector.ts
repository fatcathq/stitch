import WSOrderBook from 'ws-orderbook'
import config from '../utils/config'

export default WSOrderBook(config.exchange)
