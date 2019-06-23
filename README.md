# Stitch High Level Specification

![](https://upload.wikimedia.org/wikipedia/en/d/d2/Stitch_%28Lilo_%26_Stitch%29.svg)

## Abstract
Triangular or three-point arbitrage is the act of exploiting an arbitrage opportunity resulting from a pricing discrepancy among three different or more currencies in in FOREX trading. The theory behind triangular arbitrage can be found here: <https://en.wikipedia.org/wiki/Triangular_arbitrage>.

*Stitch* is a high frequency cryptocurrency arbitrage trader (and a fictional Disney character), used for exploiting triangular opportunities detected in a cryptocurrency exchange. The following specification describes how the MVP trader detects, logs and exploits the triangular arbitrage opportunities, along with the basic architecture of the codebase. 

## Installation

- Copy config/config.json.template to config/config.json and set up the configuration file properly. Keep in mind that in order to run the trader, you can just set up your api keys and leave all the other properties to the default ones.
- Install the needed dependencies: `npm install`
- Buld the typescript project: `npm run-script build`
- Run stitch: `npm run-script run`

To avoid building and running the project each time you modify the codebase, consider using ts-node as a global dependency. In that way you can just run the trader with `ts-node src/index.ts`.

## Triangular arbitrage in cryptocurrencies

As stated before triangular arbitrage is the act of profiting from a difference that theoretically shouldn’t exist. The extended theory of triangular crypto arbitrage is explained in the theoritical paper (TODO: Add paper link). A practical example of such arbitrage is: 

Let's say we have 1 ETH on exchange X and we can place market orders with the following exchange rates: (TODO: explain with limit orders, and fees).
`DTH/ETH = 0.000112905812`
`DTH/USDT = 0.0237524`
`ETH/USDT = 207.705411`

With these exchange rates there is an arbitrage opportunity:
```
- Bid on DTH/ETH. Get 1 / 0.000112905 = 8856.94 DTH
- Sell on DTH/USDT. Get 8856.94 * 0.02375 = 210.3735 USDT
- Bid on `ETH/USDT`. Get 210.3735 / 207.705411 = 1.01284 ETH 
```
We observe that with trading on this triangle, we receive an arbitrage profit of 0.01284 ETH.
