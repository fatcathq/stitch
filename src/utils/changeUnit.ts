import axios from 'axios'

const BASE_URL = 'https://min-api.cryptocompare.com/data/price'

export type ValueUnit = {
  value: number
  unit: string
}

export default async (valueUnits: ValueUnit[], target: string): Promise<void> => {
  const url = `${BASE_URL}?fsym=${target}&tsyms=${valueUnits.map((l: ValueUnit) => l.unit).join(',')}`

  return axios.get(url).then(r => r.data)
}
