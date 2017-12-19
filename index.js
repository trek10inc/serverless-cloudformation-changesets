'use strict'

const _ = require('lodash')
const createChangeSet = require('./lib/createChangeSet')
const setBucketName = require('serverless/lib/plugins/aws/lib/setBucketName')

class ServerlessCloudFormationChangeSets {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = _.merge(
      {},
      _.omit(options, ['changeset']),
      _.get(serverless.service, 'custom.cf-changesets') || {}
    )
    this.provider = this.serverless.getProvider('aws')

    if (options.changeset) {
      this.options.requireChangeSet = true
      if (typeof options.changeset === 'string') {
        this.options.changeSetName = options.changeset
      }
    }

    if (this.options.requireChangeSet) {
      this.hooks = {
        'before:aws:deploy:deploy:updateStack': this.lockStackDeployment.bind(this),
        'aws:deploy:deploy:updateStack': () => Promise.resolve()
          .then(setBucketName.setBucketName.bind(this))
          .then(createChangeSet.createChangeSet.bind(this)),
        'after:aws:deploy:deploy:updateStack': this.unlockStackDeployment.bind(this)
      }
    }
  }

  lockStackDeployment () {
    this.shouldNotDeploy = this.serverless.service.provider.shouldNotDeploy
    this.serverless.service.provider.shouldNotDeploy = true
  }

  unlockStackDeployment () {
    this.serverless.service.provider.shouldNotDeploy = this.shouldNotDeploy
  }
}

module.exports = ServerlessCloudFormationChangeSets
