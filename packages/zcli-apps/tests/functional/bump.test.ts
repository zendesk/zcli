import { expect, test } from '@oclif/test'
import BumpCommand from '../../src/commands/apps/bump'
import * as fs from 'fs'
import * as path from 'path'
import { getManifestFile } from '../../src/utils/manifest'

describe('bump', () => {
  describe('with valid version in manifest', () => {
    let manifestPath
    beforeEach(async () => {
      manifestPath = path.join(__dirname, '/mocks/sample_manifest')
      fs.copyFileSync(path.join(manifestPath, '/manifest_with_valid_version.json'), path.join(manifestPath, '/manifest.json'))
    })

    afterEach(() => fs.unlinkSync(path.join(manifestPath, '/manifest.json')))

    test
      .it('should bump patch version', async () => {
        await BumpCommand.run([manifestPath])
        const manifest = getManifestFile(manifestPath)
        expect('1.0.1').to.eq(manifest.version)
      })

    test
      .it('should bump patch version', async () => {
        await BumpCommand.run([manifestPath, '-p'])
        const manifest = getManifestFile(manifestPath)
        expect('1.0.1').to.eq(manifest.version)
      })

    test
      .it('should bump patch version', async () => {
        await BumpCommand.run([manifestPath, '--patch'])
        const manifest = getManifestFile(manifestPath)
        expect('1.0.1').to.eq(manifest.version)
      })

    test
      .it('should bump minor version', async () => {
        await BumpCommand.run([manifestPath, '-m'])
        const manifest = getManifestFile(manifestPath)
        expect('1.1.0').to.eq(manifest.version)
      })

    test
      .it('should bump minor version', async () => {
        await BumpCommand.run([manifestPath, '--minor'])
        const manifest = getManifestFile(manifestPath)
        expect('1.1.0').to.eq(manifest.version)
      })

    test
      .it('should bump major version', async () => {
        await BumpCommand.run([manifestPath, '-M'])
        const manifest = getManifestFile(manifestPath)
        expect('2.0.0').to.eq(manifest.version)
      })

    test
      .it('should bump major version', async () => {
        await BumpCommand.run([manifestPath, '--major'])
        const manifest = getManifestFile(manifestPath)
        expect('2.0.0').to.eq(manifest.version)
      })
  })

  describe('with invalid version in manifest', () => {
    let manifestPath
    beforeEach(async () => {
      manifestPath = path.join(__dirname, '/mocks/sample_manifest')
      fs.copyFileSync(path.join(manifestPath, '/manifest_with_invalid_version.json'), path.join(manifestPath, '/manifest.json'))
    })

    afterEach(() => fs.unlinkSync(path.join(manifestPath, '/manifest.json')))

    const failureMessage = '1.0 is not a valid semantic version'

    test
      .it('should fail with error', async () => {
        try {
          await BumpCommand.run([manifestPath])
        } catch (e) {
          expect(e.message).to.contain(failureMessage)
        }
      })
  })
})
