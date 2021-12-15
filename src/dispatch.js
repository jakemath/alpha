/*
Author: Jake Mathai
Purpose: Entrypoint script for running tasks
*/

const dispatch = async() => {
    const config = require('./conf.json')[process.env['TASK']]
    const taskModule = require('./' + config['module'])
    const taskFunction = config['function']
    const taskArgs = config['args'] || []
    await taskModule[taskFunction](...taskArgs)
}

dispatch().then(() => {
    process.exit(0)
}).catch(error => {
    console.error(error)
    process.exit(1)
})
