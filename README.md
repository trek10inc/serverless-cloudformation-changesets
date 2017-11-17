# serverless-cloudformation-changesets
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)


Serverless framework plugin to create CloudFormation ChangeSets.

## Installation

Install the plugin from npm

```bash
$ npm install --save serverless-cloudformation-changesets
```

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-cloudformation-changesets
```

## Usage
Add `--changeset` option to the sls deployment command, ex:
```bash
$ sls deploy --changeset --stage dev --region us-east-1
```
`--changeset` by default uses a timestamp for ChangeSet name, otherwise you can provide optional `--changeset` value:
```bash
$ sls deploy --changeset your-changeset-name --stage dev --region us-east-1
```

If CloudFormation Stack doesn't exist, this plugin will create a new one (without template, resources). The stack will be in the `REVIEW_IN_PROGRESS` state.
