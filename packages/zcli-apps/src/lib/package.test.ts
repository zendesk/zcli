import { expect, test } from '@oclif/test'
import { validatePkg } from './package'
import * as fs from 'fs-extra'
import { request } from '@zendesk/zcli-core'

describe('package', () => {
  describe('validatePkg', () => {
    test
      .stub(fs, 'pathExistsSync', () => true)
      .stub(fs, 'readFile', () => Promise.resolve('file content'))
      .stub(request, 'requestAPI', () => Promise.resolve({ status: 200 }))
      .it('should return true if package is valid', async () => {
        expect(await validatePkg('./app-path')).to.equal(true)
      })

    test
      .stub(fs, 'pathExistsSync', () => true)
      .stub(fs, 'readFile', () => Promise.resolve('file content'))
      .stub(request, 'requestAPI', () => Promise.resolve({ status: 400, data: { description: 'invalid location' } }))
      .it('should throw if package has validation errors', async () => {
        try {
          await validatePkg('./app-path')
        } catch (error: unknown) {
          expect((error as Error).message).to.equal('invalid location')
        }
      })

    test
      .stub(fs, 'pathExistsSync', () => false)
      .stub(fs, 'readFile', () => Promise.reject(new Error('Package not found at ./bad-path')))
      .it('should throw if app path is invalid', async () => {
        try {
          await validatePkg('./bad-path')
        } catch (error: unknown) {
          expect((error as Error).message).to.equal('Package not found at ./bad-path')
        }
      })
  })
})
