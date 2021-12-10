/*
Author: Jake Mathai
Purpose: TDA client
*/
const qs = require('qs');
const axios = require('axios')
const { TDAmeritrade } = require('@knicola/tdameritrade')

const secretsmanager = require('../aws/secretsmanager')

// const TDAClient = async() => {

    // let accountUrl,
    //     orderUrl,
    //     quoteParams = {
    //         'apiKey': ''
    //     },
    //     quotesParams = {
    //         'apiKey': '',
    //         'symbol': ''
    //     },
    //     accessToken,
    //     consumerKey,
    //     clientId,
    //     refreshToken,
    //     newAccessTokenParams = {
    //         'grant_type': 'refresh_token',
    //         'refresh_token': '',
    //         'client_id': ''
    //     },
    //     header = {'Authorization': 'Bearer ' + accessToken},
    //     minCashBalance = 25000

    // const refreshUrl = 'https://api.tdameritrade.com/v1/oauth2/token'

    // const setCredentials = async() => {
    //     const tdaCredentials = await secretsmanager.getApiKeys('tda')
    //     accountUrl = tdaCredentials['accountUrl']
    //     orderUrl = accountUrl + '/orders'
    //     newAccessTokenParams = {
    //         'grant_type': 'refresh_token',
    //         'refresh_token': refreshToken,
    //         'client_id': clientId
    //     }
    //     quoteParams['apiKey'] = clientId
    //     quotesParams['apiKey'] = clientId
    //     accessToken = tdaCredentials['accessToken']
    //     header['Authorization'] = 'Bearer ' + accessToken
    //     consumerKey = tdaCredentials['consumerKey']
    //     clientId = tdaCredentials['clientId']
    //     refreshToken = tdaCredentials['refreshToken']
    // }

    // const updateAccessToken = async() => {
    //     const response = await axios.post(refreshUrl, newAccessTokenParams)
    //     accessToken = response['access_token']
    //     let secrets = await secretsmanager.getApiKeys()
    //     secrets['tda']['accessToken'] = accessToken
    //     await secretsmanager.updateSecret('keys', secrets)
    //     newAccessTokenParams['refresh_token'] = refreshToken
    //     newAccessTokenParams['client_id'] = clientId
    // }

//     await setCredentials()
//     await updateAccessToken()

//     const subscribe = async(service, )

//     return {
//         updateAccessToken
//     }
// }

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

        return new TDAmeritrade({
            'apiKey': consumerKey,
            'refreshAndRetry': true,
            'refreshToken': refreshToken,
            'accessToken': accessToken,
            'redirectUri': 'https://localhost:8443',
            'sslKey': '/src/selfsigned.key',
            'sslCert': '/src/selfsigned.crt',
        })
    }
    catch(e) {
        throw new Error(`TDA_CLIENT: ${e}`)
    }
}
module.exports = {
    TDAClient
}
