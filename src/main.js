const Core = require('@actions/core')
const Github = require('@actions/github')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const isTest = isTestStatus() // test input on the action.yml

    // some needs
    // const Context = getGhContext()
    // const Payload = getGhPayload()
    // const Token = getGhToken()
    // const Octokit = getOctokit()

    if (isTest) {
      //code for testing locally or on prod
      Core.info('on testing')

      return
    }

    Core.info('on production')

    // Put an output variable
    // Core.setOutput('response', 'some result')
  } catch (error) {
    // Fail the workflow run if an error occurs
    Core.setFailed(error.message)
  }
}

function isTestStatus() {
  return Core.getInput('test', { required: false }) === 'true'
}

function getRepoOwner() {
  return Github.context.repo.owner
}

function getRepoName() {
  return Github.context.repo.repo
}
function getGhContext() {
  return Github.context
}
function getGhPayload() {
  return Github.context.payload
}
function getCommitSha() {
  return Github.context.sha
}
function getGhToken() {
  return Core.getInput('gh_token')
}
function getOctokit() {
  return Github.getOctokit(getGhToken())
}

module.exports = {
  run
}
