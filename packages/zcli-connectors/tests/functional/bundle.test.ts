import { test } from '@oclif/test'
import BundleCommand from '../../src/commands/connectors/bundle'

describe('bundle', () => {
  describe('with default directory', () => {
    test
      .it('should run bundle command with default directory', async () => {
        await BundleCommand.run(['.'])
        // Test passes if no error is thrown
      })
  })

  describe('with custom directory', () => {
    test
      .it('should run bundle command with custom directory', async () => {
        await BundleCommand.run(['./custom'])
        // Test passes if no error is thrown
      })
  })
})
