'use strict'

const { createChangeSet } = require('./lib/createChangeSet')

class ServerlessCloudFormationChangeSets {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider('aws')

    if (this.options.changeset) {
      this.hooks = {
        'before:aws:deploy:deploy:updateStack': this.lockStackDeployment.bind(this),
        'aws:deploy:deploy:updateStack': createChangeSet.bind(this),
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
