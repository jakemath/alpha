/*
Author: Jake Mathai
Purpose: TDA tasks
*/

const fs = require('fs')
const { parseStringPromise } = require('xml2js')

const time = require('../utils/time')
const { TDAClient, ORDER } = require('../utils/exchange/tda')

/*
Modes:
    - debug - stream data and make fake trades
    - live - stream data and make real trades
*/

const MIN_CASH_BALANCE = 25000

const tda = async(mode='debug') => {
    try {
        console.log(`Running TDA task in ${mode} mode`)
        let tda = await TDAClient()
        let accountInfo = (await tda.getAccounts())[0]
        let accountId = accountInfo['accountId']
        let currentBalances = account['currentBalances']
        let cashBalance = currentBalances['cashBalance'] - MIN_CASH_BALANCE
        
        const placeOrder = async(symbol, action, shares, currentPrice, limitPrice) => {
            let order = ORDER
            order['price'] = limitPrice
            order['quantity'] = shares
            order['orderLegCollection'][0]['instrument']['symbol'] = symbol
            order['orderLegCollection'][0]['instrument']['instruction'] = action
            await tda.placeOrder(accountId, order)
        }
        
        const defaultHandler = async(symbol, action, currentPrice, limitPrice) => {
            const shares = parseInt(cashBalance / limitPrice)
            const data = {
                'symbol': symbol,
                'action': action,
                'current_price': currentPrice,
                'shares': shares,
                'limit_price': limitPrice
            }
            fs.appendFileSync('./log.txt', JSON.stringify(data) + '\n');
            return shares
        }
        
        let locks = {}
        let handler
        if (mode == 'live')
            handler = async(symbol, action, currentPrice, limitPrice) => {
                const shares = await defaultHandler(symbol, action, currentPrice, limitPrice)
                if (shares >= 1 && !locks[symbol]) {
                    locks[symbol] = true
                    await placeOrder(symbol, action, shares, currentPrice, limitPrice)
                }
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
                console.log('[L1]', symbol)
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
                const bidPrice = updatedQuote['bidPrice']
                const askPrice = updatedQuote['askPrice']
                const currentPrice = (bidPrice + askPrice) / 2
                let action, limitPrice
                if (bullRatio <= 0.25) {
                    action = 'SELL'
                    limitPrice = (1 - bullRatio)*currentPrice + bullRatio*askPrice
                }
                else if (bullRatio >= 0.75) {
                    action = 'BUY'
                    limitPrice = bullRatio*currentPrice + (1 - bullRatio)*bidPrice
                }
                else
                    return null
                return await handler(symbol, action, (bidPrice + askPrice) / 2, limitPrice)
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
                // symbols = ['TSLA']
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
                console.log(`[L1 ERROR]: ${e}`)
            }
        })

        const parseXml = async xml => {
            const data = await parseStringPromise(xml)
            return JSON.parse(JSON.stringify(data))
        }

        streamer.on('account_activity', async data => {
            try {
                const xmlData = await parseXml(data['messageData'])
                console.log('[ACCOUNT]', xmlData)
                orderFillMessage = xmlData['OrderFillMessage']
                if (orderFillMessage != null) {
                    const symbol = orderFillMessage['Order'][0]['Security']['Symbol'][0]
                    locks[symbol] = false
                    tradeCredits = orderFillMessage['TradeCreditAmount']
                    for (const credit of tradeCredits)
                        cashBalance += parseFloat(credit)
                    
                }
                return null
            }
            catch(e) {
                console.log('[ACCOUNT ERROR]', e)
            }
        })
        streamer.on('disconnected', () => {
            console.log('Disconnected???')
            streamer.connect()
            return null
        })

        streamer.connect()
        while (true) {
            await time.sleep(3600)
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
