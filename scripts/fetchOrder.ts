import Api from './src/connectors/api'

const api = new Api()
const orderId = 'ad7bd29d-3a47-40c9-be75-58608c45e4ec'

const main = async () => {
  try {
    const apiRes = await api.fetchOrder(orderId)
    console.log(apiRes)
  } catch (e) {
    console.log(e)
  }
}

main()
