import { expect } from '@oclif/test'
import { validateAppPath } from './appPath'

describe('appPath', () => {
  describe('validateAppPath', () => {
    const badPath = './badPath'

    it('should throw an error if path does not exist', () => {
      expect(() => {
        validateAppPath(badPath)
      }).to.throw(`Invalid app path: ${badPath}`)
    })
  })
})
