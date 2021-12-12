/*
Author: Jake Mathai
Purpose: TDA tasks
*/

const time = require('../utils/time')
const { TDAClient } = require('../utils/exchange/tda')

/*
Modes:
    - debug - stream data and make fake trades
    - live - stream data and make real trades
*/
const tda = async(mode='debug') => {
    try {
        console.log(`Running TDA task in ${mode} mode`)
        let tda = await TDAClient()
        const account = (await tda.getAccounts())[0]
        
        const calculateOrder = async(symbol, action, orderType, currentPrice, limitPrice=null) => 100
        const placeOrder = async(symbol, action, shares, orderType, currentPrice, limitPrice=null) => {}
        
        const defaultHandler = async(symbol, action, orderType, currentPrice, limitPrice=null) => {
            const shares = await calculateOrder(symbol, action, orderType, currentPrice, limitPrice)
            console.log(`${action} ${symbol} $${currentPrice} X`, shares, '@', orderType == 'limit' ? `limit $${limitPrice}` : 'MARKET')
            return shares
        }

        let handler
        if (mode == 'live')
            handler = async(symbol, action, orderType, currentPrice, limitPrice=null) => {
                const shares = await defaultHandler(symbol, action, orderType, currentPrice, limitPrice)
                if (shares != 0)
                    await placeOrder(symbol, action, shares, orderType, currentPrice, limitPrice)
                return null
            }
        else
            handler = defaultHandler
        let streamer = await tda.streamer()
        let quotes = {}
        const quoteFields = ['bidPrice', 'askPrice', 'bidSize', 'askSize']

        const readQuote = async newQuote => {
            try {
                const symbol = newQuote['key']
                let lastQuote = quotes[symbol]
                if (lastQuote == null) {
                    quotes[symbol] = newQuote
                    return null
                }
                let updatedQuote = lastQuote
                for (const field of quoteFields) {
                    const lastValue = lastQuote[field]
                    const newValue = newQuote[field]
                    if (newValue != undefined && newValue != lastValue)
                        updatedQuote[field] = newValue
                }
                quotes[symbol] = updatedQuote
                const bullRatio = updatedQuote['bidSize'] / (updatedQuote['bidSize'] + updatedQuote['askSize'])
                console.log(`${symbol} bull ratio:`, bullRatio)
                const bidPrice = updatedQuote['bidPrice']
                const askPrice = updatedQuote['askPrice']
                let action, targetPrice
                if (bullRatio <= 0.25) {
                    action = 'SELL'
                    targetPrice = Math.max((1 - bullRatio)*askPrice + bullRatio*Math.floor(askPrice), bidPrice)
                }
                else if (bullRatio >= 0.75) {
                    action = 'BUY'
                    targetPrice = Math.min(bullRatio*bidPrice + (1 - bullRatio)*Math.ceil(bidPrice), askPrice)
                }
                else
                    return null
                return await handler(symbol, action, 'limit', (bidPrice + askPrice) / 2, targetPrice)
            }
            catch(e) {
                throw new Error(`READ_QUOTE: ${e}`)
            }
        }

        streamer.on('authenticated', async() => {
            let symbols
            if (mode == 'debug') {
                const nasdaqSymbols = require('../utils/exchange/nasdaq.json')['symbols']
                const nyseSymbols = require('../utils/exchange/nyse.json')['symbols']
                symbols = [...(new Set(nasdaqSymbols.concat(nyseSymbols)))]
            }
            else
                symbols = ['TSLA']
            console.log(`Authenticated - subscribing to level 1 equity data for ${symbols.length} symbols:`, symbols)
            streamer.setQOS('express')
            streamer.subsAccountActivity()
            streamer.subsLevelOneEquity(symbols, ['symbol', 'bidPrice', 'askPrice', 'bidSize', 'askSize'])
            return null
        })
        streamer.on('level_one_equity', async data => {
            try {
                let newQuotes = data['content']
                for (const newQuote of newQuotes)
                    readQuote(newQuote)
                return null
            }
            catch(e) {
                console.log(`L1_EQUITY: ${e}`)
            }
        })
        streamer.on('account_activity', async data => {
            console.log(time.timestamp(), 'Account activity:', data)
            return null
        })
        streamer.on('disconnected', () => {
            console.log('Disconnected???')
            streamer.connect()
            return null
        })

        streamer.connect()
        while (true) {
            await time.sleep(60)
            streamer.disconnect()
        }
    }
    catch(e) {
        console.log('TDA:', e)
    }
}

module.exports = {
    tda
}
