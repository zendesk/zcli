import { expect, test } from '@oclif/test'
import { validatePkg } from './package'
import * as fs from 'fs-extra'
import { request } from '@zendesk/zcli-core'

describe('package', () => {
  describe('validatePkg', () => {
    test
      .stub(fs, 'pathExistsSync', () => true)
      .stub(request, 'requestAPI', () => Promise.resolve({ status: 200 }))
      .it('should return true if package is valid', async () => {
        expect(await validatePkg('./app-path')).to.equal(true)
      })

    test
      .stub(fs, 'pathExistsSync', () => true)
      .stub(request, 'requestAPI', () => Promise.resolve({ status: 400, data: { description: 'invalid location' } }))
      .do(async () => {
        await validatePkg('./app-path')
      })
      .catch('invalid location')
      .it('should throw if package has validation errors')

    test
      .stub(fs, 'pathExistsSync', () => false)
      .do(async () => {
        await validatePkg('./bad-path')
      })
      .catch('Package not found at ./bad-path')
      .it('should throw if app path is invalid')
  })
})
