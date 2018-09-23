# Stitch High Level Specification

![](https://upload.wikimedia.org/wikipedia/en/d/d2/Stitch_%28Lilo_%26_Stitch%29.svg)

## Abstract
Triangular or three-point arbitrage is the act of exploiting an arbitrage opportunity resulting from a pricing discrepancy among three different or more currencies in in FOREX trading. The theory behind triangular arbitrage can be found here: <https://en.wikipedia.org/wiki/Triangular_arbitrage>.

*Stitch* is a high frequency cryptocurrency arbitrage trader (and a fictional Disney character), used for exploiting triangular opportunities detected in a cryptocurrency exchange. The following specification describes how the MVP trader detects, logs and exploits the triangular arbitrage opportunities, along with the basic architecture of the codebase. 

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

## Logger
Logger is the module of Stitch which is responsible for detecting every opportunity between 3 currencies, in a given exchange. The end goals of the logger are:
   
- Logging the opportunities for post statistical analysis.
- Trigger the *Stitch* engine to start trading on every profitable triangle. 

### Implementation
As explained in the theoritical paper, we represent an exchange as a Graph with all exchange currencies as Nodes, and all markets A/B as Edges. For example, an exchange X, having a market A/B with last price: P_a/b = 210.21  is represented as a graph having 2 nodes A and B, and edges (A,B) with W_(a,b) = 210.21 (ask) and (B,A) with W_(b,a) = 1 / 210.21.
