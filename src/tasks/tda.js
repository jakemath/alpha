/*
Author: Jake Mathai
Purpose: TDA tasks
*/

const time = require('../utils/time')
const { TDAClient } = require('../utils/exchange/tda')

const tda = async() => {
    try {
        const nasdaqSymbols = require('../utils/exchange/nasdaq.json')['symbols']
        const nyseSymbols = require('../utils/exchange/nyse.json')['symbols']
        const uniqueSymbols = [...(new Set(nasdaqSymbols.concat(nyseSymbols)))]
        let tda = await TDAClient()
        let streamer = await tda.streamer()
        let quotes = {}

        const updateQuoteField = (symbol, field, lastQuote, newQuote) => {
            const lastValue = lastQuote[field]
            const newValue = newQuote[field]
            if (newValue != undefined && newValue != lastValue) {
                console.log(`${symbol} new ${field}:`, newValue)
                return newValue
            }
            return lastValue
        }

        const updateQuote = async newQuote => {
            const symbol = newQuote['key']
            let lastQuote = quotes[symbol]
            if (lastQuote == null) {
                quotes[symbol] = newQuote
                return null
            }
            for (const field of ['bidPrice', 'askPrice', 'bidSize', 'askSize'])
                lastQuote[field] = updateQuoteField(symbol, field, lastQuote, newQuote)
            quotes[symbol] = lastQuote
        }

        streamer.on('authenticated', () => {
            console.log('Authenticated - subscribing to level 1 equity data')
            streamer.setQOS('express')
            streamer.subsAccountActivity()
            streamer.subsLevelOneEquity(uniqueSymbols, ['symbol', 'bidPrice', 'askPrice', 'bidSize', 'askSize'])
        })
        streamer.on('level_one_equity', data => {
            let newQuotes = data['content']
            for (const quote of newQuotes)
                updateQuote(quote)
        })
        streamer.on('account_activity', data => {
            console.log(time.timestamp(), 'Account activity:', data)
        })
        streamer.on('disconnected', () => console.log('Disconnected??'))
        streamer.connect()
        while (true)
            await time.sleep(3600)
    }
    catch(e) {
        console.log('TDA:', e)
    }
}

module.exports = {
    tda
}
