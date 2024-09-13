const core = require('@actions/core')
const { wait } = require('./wait')

console.log('Action starting')
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const isTest = core.getInput('test', { required: true })

    await example()
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

async function example() {
  const ms = 100

  // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
  core.debug(`Waiting ${ms} milliseconds ...`)

  // Log the current timestamp, wait, then log the new timestamp
  core.debug(new Date().toTimeString())
  await wait(parseInt(ms, 10))
  core.debug(new Date().toTimeString())

  // Set outputs for other workflow steps to use
  core.setOutput('time', new Date().toTimeString())
}

module.exports = {
  run
}
