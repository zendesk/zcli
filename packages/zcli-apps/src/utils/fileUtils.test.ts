import { expect, test } from '@oclif/test'
import { cleanDirectory, validatePath } from './fileUtils'

describe('clean directory', () => {
  test
    .it('shows success message', async () => {
      expect(await cleanDirectory('tmp')).to.equal(true)
    })
})

describe('validatePath', () => {
  const badPath = './badPath'

  it('should throw an error if path does not exist', () => {
    expect(() => {
      validatePath(badPath)
    }).to.throw(`Invalid path: ${badPath}`)
  })
})
