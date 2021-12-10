/*
Author: Jake Mathai
Purpose: Secrets Manager client
*/

const { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager')

let credentials = {'region': 'us-west-1'}
try {
    credentials['credentials'] = require('./credentials.json')
}
catch {
    console.log('SecretsManager credentials not found - assuming IAM role')
}

const client = new SecretsManagerClient(credentials)

const getSecret = async secretId => {
    try {
        return (await client.send(
            new GetSecretValueCommand({
                'SecretId': secretId
            })
        ))['SecretString']
    }
    catch(e) {
        throw new Error(`GET_SECRET: ${e}`)
    }
}

const getApiKeys = async(provider=null) => {
    let keys = JSON.parse(await getSecret('keys'))
    if (provider == null)
        return keys
    return keys[provider]
}

const updateSecret = async(secretId, newSecretValue) => {
    try {
        return await client.send(
            new UpdateSecretCommand({
                'SecretId': secretId,
                'SecretString': JSON.stringify(newSecretValue)
            })
        )
    }
    catch(e) {

    }
}

module.exports = {
    getSecret,
    getApiKeys,
    updateSecret
}