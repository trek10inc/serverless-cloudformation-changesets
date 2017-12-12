'use strict'

const createChangeSet = require('./lib/createChangeSet')
const setBucketName = require('serverless/lib/plugins/aws/lib/setBucketName')

class ServerlessCloudFormationChangeSets {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider('aws')

    if (this.options.changeset) {
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
