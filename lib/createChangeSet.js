'use strict'

const _ = require('lodash')
const NO_UPDATE_MESSAGE = 'No updates are to be performed.'

module.exports = {
  createChangeSet () {
    const compiledTemplateFileName = 'compiled-cloudformation-template.json'
    const templateUrl = `https://s3.amazonaws.com/${this.serverless.service.provider.deploymentBucket}/${this.serverless.service.package.artifactDirectoryName}/${compiledTemplateFileName}`
    const stackName = this.provider.naming.getStackName()
    const changeSetName = typeof this.options.changeset === 'string' ? this.options.changeset : `${stackName}-${Date.now()}`
    let stackTags = {
      STAGE: this.options.stage
    }

    this.serverless.cli.log(`Creating CloudFormation ChangeSet: ${changeSetName}...`)

    // Merge additional stack tags
    if (typeof this.serverless.service.provider.stackTags === 'object') {
      stackTags = _.extend(stackTags, this.serverless.service.provider.stackTags)
    }

    const params = {
      StackName: stackName,
      ChangeSetName: changeSetName,
      Capabilities: [
        'CAPABILITY_IAM',
        'CAPABILITY_NAMED_IAM'
      ],
      Parameters: [],
      TemplateURL: templateUrl,
      Tags: Object.keys(stackTags).map((key) => ({
        Key: key,
        Value: stackTags[key]
      }))
    }

    if (this.serverless.service.provider.cfnRole) {
      params.RoleARN = this.serverless.service.provider.cfnRole
    }

    return this.provider
      .request(
        'CloudFormation',
        'createChangeSet',
        params,
        this.options.stage,
        this.options.region
      )
      .catch((e) => {
        if (e.message === NO_UPDATE_MESSAGE) {
          return
        }
        throw e
      })
  }
}
