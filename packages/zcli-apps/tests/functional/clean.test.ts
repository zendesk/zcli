import { expect, test } from '@oclif/test'
import * as fs from 'fs'
import * as path from 'path'

const singleProductApp = path.join(__dirname, 'mocks/single_product_app')

describe('clean', () => {
  const cleanCmdTest = test
    .register('createDirectory', (dir) => {
      return {
        run () {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
          }
        }
      }
    })
    .register('createFile', () => {
      return {
        run () {
          fs.appendFile('./tmp/testFile.ts', 'Test content', function (err) {
            if (err) throw err
          })
        }
      }
    })

  cleanCmdTest
    .createDirectory('tmp')
    .createFile()
    .stdout()
    .command(['apps:clean', singleProductApp])
    .it('shows success message and also clears all the files!', async (ctx) => {
      const tmpDirectoryPath = path.join(process.cwd(), 'tmp')
      expect(ctx.stdout).to.contain(
        `Successfully removed ${tmpDirectoryPath} directory`
      )
      expect(fs.existsSync('tmp')).to.equal(false)
    })
})
