'use strict'

const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const { createChangeSet } = require('./createChangeSet')
const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const ServerlessCloudFormationChangeSets = require('../index')
const sinon = require('sinon')

describe('updateStack', () => {
  let serverless
  let serverlessChangeSets

  beforeEach(() => {
    serverless = new Serverless()
    serverless.config.servicePath = 'foo'
    serverless.setProvider('aws', new AwsProvider(serverless))
    const options = {
      stage: 'dev',
      region: 'us-east-1',
      changeset: 'test'
    }
    serverlessChangeSets = new ServerlessCloudFormationChangeSets(serverless, options)
    serverless.service.service = `service-${(new Date()).getTime().toString()}`
    serverlessChangeSets.bucketName = 'deployment-bucket'
    serverlessChangeSets.serverless.service.package.artifactDirectoryName = 'somedir'
    serverlessChangeSets.serverless.cli = new serverless.classes.CLI()
  })

  describe('#createChangeSet()', () => {
    let createChangeSetStub

    beforeEach(() => {
      createChangeSetStub = sinon
        .stub(serverlessChangeSets.provider, 'request').resolves()
    })

    afterEach(() => {
      createChangeSetStub.restore()
    })

    it('should create the CF ChangeSet', () => createChangeSet.bind(serverlessChangeSets)()
      .then(() => {
        sinon.assert.calledOnce(createChangeSetStub)
        sinon.assert.calledWithExactly(createChangeSetStub,
          'CloudFormation',
          'createChangeSet',
          {
            StackName: serverlessChangeSets.provider.naming.getStackName(),
            ChangeSetName: 'test',
            Capabilities: [
              'CAPABILITY_IAM',
              'CAPABILITY_NAMED_IAM'
            ],
            ChangeSetType: 'UPDATE',
            Parameters: [],
            TemplateURL: 'https://s3.amazonaws.com/deployment-bucket/somedir/compiled-cloudformation-template.json',
            Tags: [{ Key: 'STAGE', Value: 'dev' }]
          },
          'dev',
          'us-east-1'
        )
      })
    )

    it('should generate ChangSet name if it\'s not provided', () => {
      const fakeTimer = sinon.useFakeTimers(1510926650275)
      const stackName = serverlessChangeSets.provider.naming.getStackName()
      serverlessChangeSets.options.changeSetName = undefined

      return createChangeSet.bind(serverlessChangeSets)()
        .then(() => {
          sinon.assert.calledWithExactly(createChangeSetStub,
            'CloudFormation',
            'createChangeSet',
            {
              StackName: stackName,
              ChangeSetName: `${stackName}-1510926650275`,
              Capabilities: [
                'CAPABILITY_IAM',
                'CAPABILITY_NAMED_IAM'
              ],
              ChangeSetType: 'UPDATE',
              Parameters: [],
              TemplateURL: 'https://s3.amazonaws.com/deployment-bucket/somedir/compiled-cloudformation-template.json',
              Tags: [{ Key: 'STAGE', Value: 'dev' }]
            },
            'dev',
            'us-east-1'
          )
          fakeTimer.restore()
        })
    })

    it('should include custom stack tags and CF service role', () => {
      serverlessChangeSets.serverless.service.provider.stackTags = { STAGE: 'overridden', tag1: 'value1' }
      serverlessChangeSets.serverless.service.provider.cfnRole = 'arn:aws:iam::123456789012:role/myrole'

      return createChangeSet.bind(serverlessChangeSets)().then(() => {
        expect(createChangeSetStub.args[0][2].Tags)
          .to.deep.equal([
            { Key: 'STAGE', Value: 'overridden' },
            { Key: 'tag1', Value: 'value1' }
          ])
        expect(createChangeSetStub.args[0][2].RoleARN).to.equal('arn:aws:iam::123456789012:role/myrole')
      })
    })

    it('should create the CF empty stack if it does not exist', () => {
      const stackName = serverlessChangeSets.provider.naming.getStackName()
      createChangeSetStub.onCall(0).rejects(new Error(`Stack [${stackName}] does not exist`))

      return createChangeSet.bind(serverlessChangeSets)()
        .then(() => {
          sinon.assert.calledTwice(createChangeSetStub)
          sinon.assert.calledWithExactly(createChangeSetStub,
            'CloudFormation',
            'createChangeSet',
            {
              StackName: stackName,
              ChangeSetName: 'test',
              Capabilities: [
                'CAPABILITY_IAM',
                'CAPABILITY_NAMED_IAM'
              ],
              ChangeSetType: 'CREATE',
              Parameters: [],
              TemplateURL: 'https://s3.amazonaws.com/deployment-bucket/somedir/compiled-cloudformation-template.json',
              Tags: [{ Key: 'STAGE', Value: 'dev' }]
            },
            'dev',
            'us-east-1'
          )
        })
    })

    it('should skip create ChangeSet if should not deploy', () => {
      serverlessChangeSets.shouldNotDeploy = true

      return createChangeSet.bind(serverlessChangeSets)()
        .then(() => {
          sinon.assert.notCalled(createChangeSetStub)
        })
    })
  })
})
