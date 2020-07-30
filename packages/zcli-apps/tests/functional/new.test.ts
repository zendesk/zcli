import { expect, test } from '@oclif/test'
import NewCommand from '../../src/commands/apps/new'
import { cleanDirectory } from '../../src/utils/fileUtils'
import * as path from 'path'
import * as fs from 'fs'

describe('apps new', () => {
  const dirName = 'myDir'
  const authorName = 'testName'
  const authorEmail = 'test@email.com'
  const appName = 'testName'
  const dirPath = path.join(process.cwd(), dirName)

  describe('--scaffold', () => {
    before(async () => {
      await NewCommand.run(['--path', dirName, '--authorName', authorName, '--authorEmail', authorEmail, '--appName', appName])
    })

    after(async () => {
      await cleanDirectory(dirPath)
    })

    test.it(`should create a directory with the name ${dirName}`, async () => {
      expect(fs.existsSync(dirPath)).to.eq(true)
    })

    // Ensure zip file is not left
    test.it('should not indicate remnants of scaffold.zip', async () => {
      const zipDirPath = path.join(process.cwd(), 'scaffold.zip')
      expect(fs.existsSync(zipDirPath)).to.eq(false)
    })

    test.it('should not create a directory with webpack configs', async () => {
      const webpackPath = path.join(process.cwd(), dirName, 'webpack')
      expect(fs.existsSync(webpackPath)).to.eq(false)
    })
  })

  describe('--scaffold=basic', () => {
    before(async () => {
      await NewCommand.run(['--scaffold', 'basic', '--path', dirName, '--authorName', authorName, '--authorEmail', authorEmail, '--appName', appName])
    })

    after(async () => {
      await cleanDirectory(dirPath)
    })

    test.it('should not create a directory with webpack configs', async () => {
      const webpackPath = path.join(process.cwd(), dirName, 'webpack')
      expect(fs.existsSync(webpackPath)).to.eq(false)
    })

    test.it('updates manifest.json with user input values', async () => {
      const manifestPath = path.join(process.cwd(), dirName, 'manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

      expect(manifest.name).to.eq(appName)
      expect(manifest.author.name).to.eq(authorName)
      expect(manifest.author.email).to.eq(authorEmail)
    })
  })

  describe('--scaffold=react', () => {
    const dirName = 'myDir'
    const dirPath = path.join(process.cwd(), dirName)

    before(async () => {
      await NewCommand.run(['--scaffold', 'react', '--path', dirName, '--authorName', authorName, '--authorEmail', authorEmail, '--appName', appName])
    })

    after(async () => {
      await cleanDirectory(dirPath)
    })

    test.it('should create a directory with webpack configs', async () => {
      const webpackPath = path.join(process.cwd(), dirName, 'webpack')
      expect(fs.existsSync(webpackPath)).to.eq(true)
    })

    test.it('updates manifest.json with user input values', async () => {
      const manifestPath = path.join(process.cwd(), dirName, 'src', 'manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

      expect(manifest.name).to.eq(appName)
      expect(manifest.author.name).to.eq(authorName)
      expect(manifest.author.email).to.eq(authorEmail)
    })
  })
})
