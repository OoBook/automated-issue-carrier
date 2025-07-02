const Core = require('@actions/core')
const Github = require('@actions/github')
const fs = require('fs')

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
      Core.info('Running in test mode')
      await handleTestMode()
      return
    }

    Core.info('Running in production mode')
    await handleProductionMode()

    // Put an output variable
  } catch (error) {
    // Fail the workflow run if an error occurs
    Core.setFailed(error.message)
  }
}

async function handleTestMode() {
  // Load test event data
  const eventPath = process.env.GITHUB_EVENT_PATH || './test-event.json'
  let eventData = {}
  
  try {
    if (fs.existsSync(eventPath)) {
      const eventJson = fs.readFileSync(eventPath, 'utf8')
      eventData = JSON.parse(eventJson)
      Core.info(`Loaded test event data from ${eventPath}`)
    }
  } catch (error) {
    Core.warning(`Could not load event data: ${error.message}`)
  }

  // Process the issue event
  await processIssueEvent(eventData, true)
}

async function handleProductionMode() {
  const context = getGhContext()
  const payload = getGhPayload()
  
  // Verify this is an issue event
  if (process.env.GITHUB_EVENT_NAME !== 'issues') {
    Core.setFailed('This action only supports issue events')
    return
  }

  await processIssueEvent(payload, false)
}

async function processIssueEvent(eventData, isTest = false) {
  const action = eventData.action
  const issue = eventData.issue
  
  if (!issue) {
    Core.setFailed('No issue data found in event payload')
    return
  }

  Core.info(`Processing issue event: ${action}`)
  Core.info(`Issue #${issue.number}: ${issue.title}`)
  
  let result = {}
  // Handle different issue actions
  let projectItemIds = []
  switch (action) {
    case 'opened':
      result = await handleIssueOpened(issue, isTest)
      projectItemIds = result.projectItemIds
      break
    case 'labeled':
      result = await handleIssueLabeled(issue, isTest)
      projectItemIds = result.projectItemIds
      break
    default:
      Core.info(`Unhandled issue action: ${action}`)
  }

  // Set output
  Core.setOutput('response', `Processed issue #${issue.number} (${action})`)
  Core.setOutput('project_item_ids', projectItemIds)
}

async function handleIssueOpened(issue, isTest) {
  Core.info(`New issue opened: #${issue.number}`)

  let projectItemIds = []
  
  // Example: Add a comment to the issue
  if(checkIssueConditions(issue)) {
    const result = await addIssueToProjects(issue, isTest)
    projectItemIds = result.projectItemIds
  }else {
    if(isTest) {
      Core.info(`Test mode: Project item will not be created"`)
    } else {
      Core.info(`Project item will not be created"`)
    }
  }

  return {
    projectItemIds
  }
}

async function handleIssueLabeled(issue, isTest) {
  Core.info(`Issue #${issue.number} was labeled with: ${issue.label?.name || 'unknown'}`)
  
  let projectItemIds = []
  if(checkIssueConditions(issue)) {    
    // Add issue to projects
    const result = await addIssueToProjects(issue, isTest)
    projectItemIds = result.projectItemIds
  } else {
    if(isTest) {
      Core.info(`Test mode: Project item will not be created"`)
    } else {
      Core.info(`Project item will not be created"`)
    }
  }

  return {
    projectItemIds
  }
}

async function addIssueToProjects(issue, isTest) {
  const octokit = getOctokit()
  const owner = getRepoOwner()
  const repo = getRepoName()

  const projects = await getRepoProjects()
  const itemFieldsObject = getProjectItemFieldValues()
  const itemFieldsKeys = Object.keys(itemFieldsObject)

  const projectItemIds = []

  for await (const project of projects) {
    // get project custom fields with octokit graphql
    // but check whether the itemFieldsKeys is in the project custom fields
    // get project default fields with octokit graphql
    const fieldsQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first: 100) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    name
                    id
                  }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                  configuration {
                    iterations {
                      startDate
                      id
                      title
                      duration
                    }
                  }
                }
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
    `;

    const projectFields = await octokit.graphql(fieldsQuery, {
      projectId: project.id
    });

    const updateableProjectFields = projectFields.node.fields.nodes.filter(field => field.dataType === 'DATE' 
      || field.dataType === 'SINGLE_SELECT' 
      || field.dataType === 'ITERATION' 
      || field.dataType === 'NUMBER' 
      || field.dataType === 'TEXT'
    )

    const existingFields = itemFieldsKeys.filter((key) => {
      let found = updateableProjectFields.some(field => Object.prototype.hasOwnProperty.call(field, 'name') && field.name === key)

      if(found) {
        let fieldObject = updateableProjectFields.find(field => Object.prototype.hasOwnProperty.call(field, 'name') && field.name === key)

        if(fieldObject.dataType === 'DATE') {
          // Handle both European DD.MM.YYYY and US MM/DD/YYYY formats
          let date;
          // Try to detect date format by looking for common delimiters
          const dateStr = itemFieldsObject[key];
          const delimiters = /[./-]/; // Match ., / or -
          
          if (delimiters.test(dateStr)) {
            // Split on any delimiter
            const parts = dateStr.split(delimiters);
            
            if (parts.length === 3) {
              // Assume European format (DD MM YYYY) if first part is <= 31
              if (parseInt(parts[0]) <= 31) {
                date = new Date(parts[2], parts[1] - 1, parts[0]); // month is 0-indexed
              } else {
                // Otherwise try US format (MM DD YYYY)
                date = new Date(parts[2], parts[0] - 1, parts[1]);
              }
            } else {
              date = new Date(dateStr);
            }

          } else {
            date = new Date(dateStr);
          }

          if(date) {
            if (!isNaN(date)) {
              itemFieldsObject[key] = date.toISOString();
            } else {
              found = false;
            }
          }

        }else if(fieldObject.dataType === 'SINGLE_SELECT') {
          found = fieldObject.options.some(option => option.name === itemFieldsObject[key])
          if(found) {
            // console.log(fieldObject.options.find(option => option.name === itemsFieldsObject[key]))
            // itemsFieldsObject[key] = fieldObject.options.find(option => option.name === itemsFieldsObject[key]).id
          }else {
            found = false
          }
        }else if(fieldObject.dataType === 'ITERATION') {
          found = fieldObject.configuration.iterations.some(iteration => iteration.title === itemFieldsObject[key])
          if(found) {
            itemFieldsObject[key] = fieldObject.configuration.iterations.find(iteration => iteration.title === itemFieldsObject[key]).id
          }else {
            found = false
          }
        }else if(fieldObject.dataType === 'NUMBER') { 
          if(parseFloat(itemFieldsObject[key]) !== NaN) {
            itemFieldsObject[key] = parseFloat(itemFieldsObject[key])
          }else {
            found = false
          }
        }
      }
      
      return found // Always return true to keep all fields
    })

    const writeableObject = {}
    existingFields.forEach(field => {
      writeableObject[field] = itemFieldsObject[field]
    })

    // get issue with octokit graphql with issue number with title, projects
    const issueQuery = `
      query($owner: String!, $name: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $name) {
          issue(number: $issueNumber) {
            id
            title
            projectItems(first: 20) {
              nodes {
                id
                project {
                  id
                  title
                }
              }
            }
            projectsV2(first: 100) {
              nodes {
                id
                title
              }
            }
          }
        }
      }
    `;

    const issueResult = await octokit.graphql(issueQuery, {
      owner,
      name: repo,
      issueNumber: issue.number
    });

    const issueProjects = issueResult.repository.issue.projectsV2.nodes
    const issueProjectItems = issueResult.repository.issue.projectItems.nodes

    // check if project.id exists in issueProjects
    const projectExists = issueProjects.some(existingProject => existingProject.id === project.id)
    
    // Find the project item ID for this specific project
    const projectItem = issueProjectItems.find(item => item.project.id === project.id)
    let projectItemId = projectItem ? projectItem.id : null

    const forceUpdate = Core.getInput('force_update', { required: false }) === 'true'
    
    if(projectExists && !forceUpdate) {
      Core.info(`Project item already exists on the project '${project.title}'`)
      continue // Move to next project instead of returning
    }

    // Add issue to project using addProjectV2ItemById mutation
    const addItemQuery = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {
          projectId: $projectId
          contentId: $contentId
        }) {
          item {
            id
          }
        }
      }
    `;

    if(isTest) {
      if(projectExists && forceUpdate) {
        Core.info(`Test mode: Force update is enabled, updating the project item`)
        // For test mode, we still need the project item ID if it exists
        if (!projectItemId) {
          Core.warning(`Could not find project item ID for project '${project.title}'`)
          continue
        }
      } else if(projectExists) {
        Core.info(`Test mode: Project item already exists on the project '${project.title}'`)
        continue;
      } else {
        Core.info(`Test mode: Project item will be created for project '${project.title}'`)
        projectItemId = 'test-id' // Use test ID for new items
      }

    } else if(!projectExists) {
      // First create the item
      const result = await octokit.graphql(addItemQuery, {
        projectId: project.id,
        contentId: issue.node_id // Use node_id which is the global ID
      });

      projectItemId = result.addProjectV2ItemById.item.id
    } else if(projectExists && forceUpdate) {
      Core.info(`Force update is enabled, updating the project item`)
      
      if (!projectItemId) {
        Core.warning(`Could not find project item ID for project '${project.title}'`)
        continue
      }
      // projectItemId is already set from the query above
    }

    projectItemIds.push(projectItemId)

    // Then update each custom field
    for await (const [fieldName, fieldValue] of Object.entries(writeableObject)) {
      const field = projectFields.node.fields.nodes.find(f => f.name === fieldName);        
      // Define the field update mutations for different field types
      const fieldMutations = {
        SINGLE_SELECT: {
          query: `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
              updateProjectV2ItemFieldValue(input: {
                projectId: $projectId
                itemId: $itemId 
                fieldId: $fieldId
                value: { singleSelectOptionId: $optionId }
              }) {
                projectV2Item {
                  id
                }
              }
            }
          `,
          getVariables: (field, fieldValue) => {
            const option = field.options.find(opt => opt.name === fieldValue);
            if (!option) {
              console.log(`Warning: Could not find option "${fieldValue}" for field "${field.name}"`);
              return null;
            }
            return {
              optionId: option.id,
              value: undefined
            };
          }
        },
        ITERATION: {
          query: `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $iterationId: String!) {
              updateProjectV2ItemFieldValue(input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: { iterationId: $iterationId }
              }) {
                projectV2Item {
                  id
                }
              }
            }
          `,
          getVariables: (field, fieldValue) => ({
            iterationId: fieldValue,
            value: undefined
          })
        },
        NUMBER: {
          query: `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Float!) {
              updateProjectV2ItemFieldValue(input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: { number: $value }
              }) {
                projectV2Item {
                  id
                }
              }
            }
          `,
          getVariables: (field, fieldValue) => ({
            value: fieldValue
          })
        },
        DATE: {
          query: `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Date!) {
              updateProjectV2ItemFieldValue(input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: { date: $value }
              }) {
                projectV2Item {
                  id
                }
              }
            }
          `,
          getVariables: (field, fieldValue) => ({
            value: fieldValue
          })
        },
        DEFAULT: {
          query: `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
              updateProjectV2ItemFieldValue(input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: { text: $value }
              }) {
                projectV2Item {
                  id
                }
              }
            }
          `,
          getVariables: (field, fieldValue) => ({
            value: fieldValue
          })
        }
      };

      // Get the appropriate mutation and variables for this field type
      const mutation = fieldMutations[field.dataType] || fieldMutations.DEFAULT;
      const customVars = mutation.getVariables(field, fieldValue);
      
      // Skip if validation failed (e.g. invalid single select option)
      if (customVars === null) {
        continue;
      }

      const variables = {
        projectId: project.id,
        itemId: projectItemId,
        fieldId: field.id,
        ...customVars
      };

      if(isTest) {
        let showValue = fieldValue
        if(field.dataType === 'ITERATION') {
          let fieldObject = updateableProjectFields.find(field => Object.prototype.hasOwnProperty.call(field, 'name') && field.name === fieldName)

          if(fieldObject.dataType === 'ITERATION') {
            showValue = fieldObject.configuration.iterations.find(iteration => iteration.id === fieldValue).title
          }
        }

        Core.info(`Test mode: ${fieldName} will be updated with '${showValue}'`)
      } else {
        await octokit.graphql(mutation.query, variables);
      }
    }
  }

  return {
    projectItemIds
  }
}

function parseLabelsPayload() {
  const labelsString = Core.getInput('labels', { required: false })
  let hasLabel = false
  let labelArray = []

  if(labelsString) {
    labelArray = labelsString.split(' ').map(label => label.split(','))
    hasLabel = true
  }

  return {
    hasLabel,
    labelArray
  }
}

function checkIssueConditions(issue) {
  let matched = true

  const { hasLabel, labelArray } = parseLabelsPayload()
  const issueLabels = issue.labels
  
  if(hasLabel) {
    matched = false
    labelArray.forEach(orLabels => {
      const allLabelsMatch = orLabels.every(orLabel => 
        issueLabels.some(issueLabel => issueLabel.name === orLabel)
      );
      if (allLabelsMatch) {
        matched = true;
      }
    });
  }

  return matched
}

async function getRepoProjects() {
  const projectString = Core.getInput('projects', { required: false })
  const octokit = getOctokit()
  const owner = getRepoOwner()
  const repo = getRepoName()

  const query = `
    query($owner: String!, $name: String!, $first: Int!) {
      repository(owner: $owner, name: $name) {
        projectsV2(first: $first) {
          nodes {
            id
            title
            number
            url
          }
        }
      }
    }
  `;

  const result = await octokit.graphql(query, {
    owner,
    name: repo,
    first: 100
  });

  if(projectString === '*') {
    return result.repository.projectsV2.nodes
  } else {
    return result.repository.projectsV2.nodes.filter(project => project.title.match(projectString))
  }
}

function getProjectItemFieldValues() {
  const itemFields = Core.getInput('item_fields', { required: false })
  const itemsFieldsObject = {}
  itemFields.split(',').forEach(field => {
    const [key, value] = field.split(':')
    itemsFieldsObject[key] = value
  })

  return itemsFieldsObject
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
