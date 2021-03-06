/*
Author: Jake Mathai
Purpose: Time utils
*/

const sleep = async seconds => await new Promise(r => setTimeout(r, seconds*1000));

const now = () => new Date()

const timestamp = () => new Date().toISOString()

module.exports = {
    sleep,
    now,
    timestamp
}
