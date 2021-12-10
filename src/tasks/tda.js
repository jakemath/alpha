/*
Author: Jake Mathai
Purpose: TDA tasks
*/

const time = require('../utils/time')
const { TDAClient } = require('../utils/exchange/tda')

const tda = async() => {
    try {
        let tda = await TDAClient()
        console.log(JSON.stringify(await tda.getAccounts()))
        let streamer = await tda.streamer()
        streamer.on('authenticated', () => {
            console.log('Authenticated - subscribing to level 1 equity data')
            streamer.setQOS('express')
            streamer.subsAccountActivity()
            streamer.subsLevelOneEquity(['SPY', 'TSLA'], ['symbol', 'bidPrice', 'askPrice'])
        })
        streamer.on('level_one_equity', data => {
            let quotes = data['content']
            quotes = quotes.map(item => ({
                'symbol': item['key'],
                'bid': item['bidPrice'],
                'ask': item['askPrice']
            }))
            console.log(time.timestamp(), 'L1 data:', quotes)
        })
        streamer.on('account_activity', data => {
            console.log(time.timestamp(), 'Account activity:', data)
        })
        streamer.on('disconnected', () => console.log('Disconnected??'))
        streamer.connect()
        while (true)
            await time.sleep(100)
    }
    catch(e) {
        console.log('FAILED:', e)
    }
}

module.exports = {
    tda
}