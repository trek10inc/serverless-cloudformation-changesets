'use strict'

const _ = require('lodash')

const createChangeSet = (plugin, stackName, changeSetName, changeSetType) => {
  const compiledTemplateFileName = 'compiled-cloudformation-template.json'
  const templateUrl = `https://s3.amazonaws.com/${plugin.bucketName}/${plugin.serverless.service.package.artifactDirectoryName}/${compiledTemplateFileName}`

  let stackTags = {
    STAGE: plugin.options.stage
  }
  // Merge additional stack tags
  if (typeof plugin.serverless.service.provider.stackTags === 'object') {
    stackTags = _.extend(stackTags, plugin.serverless.service.provider.stackTags)
  }

  const params = {
    StackName: stackName,
    ChangeSetName: changeSetName,
    Capabilities: [
      'CAPABILITY_IAM',
      'CAPABILITY_NAMED_IAM'
    ],
    ChangeSetType: changeSetType,
    Parameters: [],
    TemplateURL: templateUrl,
    Tags: Object.keys(stackTags).map((key) => ({
      Key: key,
      Value: stackTags[key]
    }))
  }

  if (plugin.serverless.service.provider.cfnRole) {
    params.RoleARN = plugin.serverless.service.provider.cfnRole
  }

  return plugin.provider
    .request(
      'CloudFormation',
      'createChangeSet',
      params,
      plugin.options.stage,
      plugin.options.region
    )
}

module.exports = {
  createChangeSet () {
    const stackName = this.provider.naming.getStackName()
    const changeSetName = this.options.changeSetName ? this.options.changeSetName : `${stackName}-${Date.now()}`

    if (this.shouldNotDeploy) {
      this.serverless.cli.log('Skipping create ChangeSet...', 'Serverless', { color: 'orange' });
      return Promise.resolve();
    }

    this.serverless.cli.log(`Creating CloudFormation ChangeSet [${changeSetName}]...`)
    return createChangeSet(this, stackName, changeSetName, 'UPDATE')
      .catch(e => {
        if (e.message.indexOf('does not exist') > -1) {
          this.serverless.cli.log(`Stack [${stackName}] does not exist. Creating a new empty stack...`)
          return createChangeSet(this, stackName, changeSetName, 'CREATE')
        }
        throw e
      })
  }
}
