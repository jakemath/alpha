/*
Author: Jake Mathai
Purpose: TDA client
*/
const qs = require('qs');
const axios = require('axios')
const { TDAmeritrade } = require('@knicola/tdameritrade')

const secretsmanager = require('../aws/secretsmanager');

const ORDER = {
    "session": 'SEAMLESS', //"'NORMAL' or 'AM' or 'PM' or 'SEAMLESS'",
    "duration": 'FILL_OR_KILL', //"'DAY' or 'GOOD_TILL_CANCEL' or 'FILL_OR_KILL'",
    "orderType": 'LIMIT', //"'MARKET' or 'LIMIT' or 'STOP' or 'STOP_LIMIT' or 'TRAILING_STOP' or 'MARKET_ON_CLOSE' or 'EXERCISE' or 'TRAILING_STOP_LIMIT' or 'NET_DEBIT' or 'NET_CREDIT' or 'NET_ZERO'",
    "quantity": 0,
    "price": 0,
    "orderLegCollection": [
        {
            "orderLegType": 'EQUITY',
            "instrument": {
                "assetType": 'EQUITY',
                "symbol": '',
            },
            "instruction": '', //"'BUY' or 'SELL' or 'BUY_TO_COVER' or 'SELL_SHORT' or 'BUY_TO_OPEN' or 'BUY_TO_CLOSE' or 'SELL_TO_OPEN' or 'SELL_TO_CLOSE' or 'EXCHANGE'",
        }
    ],
    "cancelable": true,
}

const TDAClient = async() => {
    try {
        let accountUrl = '',
            orderUrl = accountUrl + '/orders',
            quoteParams = {
                'apiKey': ''
            },
            quotesParams = {
                'apiKey': '',
                'symbol': ''
            },
            accessToken = '',
            consumerKey = '',
            clientId = '',
            refreshToken = '',
            newAccessTokenParams = {
                'grant_type': 'refresh_token',
                'refresh_token': '',
                'client_id': ''
            },
            header = {'Authorization': 'Bearer ' + accessToken},
            minCashBalance = 25000

        const refreshUrl = 'https://api.tdameritrade.com/v1/oauth2/token'

        const setCredentials = async() => {
            try {
                const tdaCredentials = await secretsmanager.getApiKeys('tda')
                accountUrl = tdaCredentials['accountUrl']
                orderUrl = accountUrl + '/orders'
                clientId = tdaCredentials['clientId']
                refreshToken = tdaCredentials['refreshToken']
                newAccessTokenParams['refresh_token'] = refreshToken
                newAccessTokenParams['client_id'] = clientId
                quoteParams['apikey'] = clientId
                quotesParams['apikey'] = clientId
                accessToken = tdaCredentials['accessToken']
                header['Authorization'] = 'Bearer ' + accessToken
                consumerKey = tdaCredentials['consumerKey']
            }
            catch(e) {
                throw new Error(`SET_CREDENTIALS: ${e}`)
            }
        }

        const updateAccessToken = async() => {
            try {
                const response = (await axios.post(refreshUrl, qs.stringify(newAccessTokenParams))).data
                accessToken = response['access_token']
                let keys = await secretsmanager.getApiKeys()
                keys['tda']['accessToken'] = accessToken
                await secretsmanager.updateSecret('keys', keys)
            }
            catch(e) {
                throw new Error(`UPDATE_ACCESS_TOKEN: ${e}`)
            }
        }

        await setCredentials()
        await updateAccessToken()
        await secretsmanager.makeKeyFile('selfsigned.crt', '/src/selfsigned.crt')
        await secretsmanager.makeKeyFile('selfsigned.key', '/src/selfsigned.key')

        let tda = new TDAmeritrade({
            'apiKey': consumerKey,
            'refreshAndRetry': true,
            'refreshToken': refreshToken,
            'accessToken': accessToken,
            'redirectUri': 'https://localhost:8443',
            'sslKey': '/src/selfsigned.key',
            'sslCert': '/src/selfsigned.crt',
        })
        return tda
    }
    catch(e) {
        throw new Error(`TDA_CLIENT: ${e}`)
    }
}

module.exports = {
    TDAClient,
    ORDER
}
