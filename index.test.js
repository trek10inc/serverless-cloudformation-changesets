'use strict'

const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const createChangeSet = require('./lib/createChangeSet')
const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const ServerlessCloudFormationChangeSets = require('./index')
const setBucketName = require('serverless/lib/plugins/aws/lib/setBucketName')
const sinon = require('sinon')

describe('ServerlessCloudFormationChangeSets', () => {
  let serverless
  let serverlessChangeSets
  let options

  beforeEach(() => {
    serverless = new Serverless()
    options = {
      stage: 'dev',
      region: 'us-east-1',
      changeset: 'test'
    }
    serverless.setProvider('aws', new AwsProvider(serverless))
    serverlessChangeSets = new ServerlessCloudFormationChangeSets(serverless, options)
    serverlessChangeSets.serverless.service.provider.shouldNotDeploy = false
  })

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(serverlessChangeSets.serverless).to.equal(serverless)
    })

    it('should set options', () => {
      expect(serverlessChangeSets.options).to.equal(options)
    })

    it('should set the provider variable to an instance of AwsProvider', () =>
      expect(serverlessChangeSets.provider).to.be.instanceof(AwsProvider))

    it('should have hooks', () => expect(serverlessChangeSets.hooks).to.be.not.empty)

    it('should have no hooks if changset options is not defined', () => {
      const options = {
        stage: 'dev',
        region: 'us-east-1'
      }
      const serverlessChangeSets = new ServerlessCloudFormationChangeSets(serverless, options)
      expect(serverlessChangeSets.hooks).to.be.undefined
    })
  })

  describe('hooks', () => {
    let setBucketNameStub
    let createChangeSetStub

    beforeEach(() => {
      setBucketNameStub = sinon
        .stub(setBucketName, 'setBucketName').resolves()
      createChangeSetStub = sinon
        .stub(createChangeSet, 'createChangeSet').resolves()
    })

    afterEach(() => {
      setBucketName.setBucketName.restore()
      createChangeSet.createChangeSet.restore()
    })

    it('should load deployment bucket name', () => {
      serverlessChangeSets.hooks['aws:deploy:deploy:updateStack']().then(() => {
        sinon.assert.calledOnce(setBucketName.setBucketName)
        sinon.assert.calledOn(setBucketName.setBucketName, serverlessChangeSets)
      })
    })

    it('should call createChangeSet', () => {
      serverlessChangeSets.hooks['aws:deploy:deploy:updateStack']().then(() => {
        sinon.assert.calledOnce(createChangeSet.createChangeSet)
        sinon.assert.calledOn(createChangeSet.createChangeSet, serverlessChangeSets)
        sinon.assert.callOrder(setBucketName.setBucketName, createChangeSet.createChangeSet)
      })
    })

    it('should prevent regular deployment', () => {
      serverlessChangeSets.hooks['before:aws:deploy:deploy:updateStack']()
      expect(serverlessChangeSets.serverless.service.provider.shouldNotDeploy).to.equal(true)
    })

    it('should restore shouldNotDeploy flag', () => {
      serverlessChangeSets.hooks['before:aws:deploy:deploy:updateStack']()
      serverlessChangeSets.hooks['after:aws:deploy:deploy:updateStack']()
      expect(serverlessChangeSets.serverless.service.provider.shouldNotDeploy).to.equal(false)
    })
  })
})
