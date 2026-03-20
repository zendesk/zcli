/* eslint-disable no-unused-expressions */

import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as fs from 'fs'
import * as path from 'path'
import BumpCommand from '../../src/commands/connectors/bump'

use(sinonChai)

describe('bump', () => {
  let bumpCommand: BumpCommand
  let fsStubs: any
  let logStub: sinon.SinonStub
  let testDir: string

  const validIndexTsContent = `import { manifest } from '@zendesk/connector-sdk';

const connector = manifest({
  name: 'test-connector',
  title: 'Test Connector',
  version: '1.0.0',
  authentication: {},
  actions: [],
});

export default connector;
`

  const doubleQuoteIndexTsContent = `import { manifest } from '@zendesk/connector-sdk';

const connector = manifest({
  name: 'test-connector',
  title: 'Test Connector',
  version: "1.0.0",
  authentication: {},
  actions: [],
});

export default connector;
`

  const invalidVersionIndexTsContent = `import { manifest } from '@zendesk/connector-sdk';

const connector = manifest({
  name: 'test-connector',
  title: 'Test Connector',
  version: '1.0',
  authentication: {},
  actions: [],
});

export default connector;
`

  const missingVersionIndexTsContent = `import { manifest } from '@zendesk/connector-sdk';

const connector = manifest({
  name: 'test-connector',
  title: 'Test Connector',
  authentication: {},
  actions: [],
});

export default connector;
`

  beforeEach(() => {
    testDir = path.resolve('test', 'connector')

    bumpCommand = new BumpCommand([], {} as any)
    logStub = sinon.stub(bumpCommand, 'log')

    fsStubs = {
      existsSync: sinon.stub(fs, 'existsSync'),
      readFileSync: sinon.stub(fs, 'readFileSync'),
      writeFileSync: sinon.stub(fs, 'writeFileSync')
    }
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('with valid version', () => {
    beforeEach(() => {
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(validIndexTsContent)
    })

    it('should bump patch version by default', async () => {
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: {}
      })

      await bumpCommand.run()

      expect(fsStubs.writeFileSync).to.have.been.calledOnce
      const writtenContent = fsStubs.writeFileSync.firstCall.args[1]
      expect(writtenContent).to.include("version: '1.0.1'")
      expect(logStub).to.have.been.calledWith(sinon.match(/1\.0\.0 to 1\.0\.1/))
    })

    it('should bump patch version with -p flag', async () => {
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: { patch: true }
      })

      await bumpCommand.run()

      const writtenContent = fsStubs.writeFileSync.firstCall.args[1]
      expect(writtenContent).to.include("version: '1.0.1'")
      expect(logStub).to.have.been.calledWith(sinon.match(/1\.0\.0 to 1\.0\.1/))
    })

    it('should bump minor version with -m flag', async () => {
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: { minor: true }
      })

      await bumpCommand.run()

      const writtenContent = fsStubs.writeFileSync.firstCall.args[1]
      expect(writtenContent).to.include("version: '1.1.0'")
      expect(logStub).to.have.been.calledWith(sinon.match(/1\.0\.0 to 1\.1\.0/))
    })

    it('should bump major version with -M flag', async () => {
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: { major: true }
      })

      await bumpCommand.run()

      const writtenContent = fsStubs.writeFileSync.firstCall.args[1]
      expect(writtenContent).to.include("version: '2.0.0'")
      expect(logStub).to.have.been.calledWith(sinon.match(/1\.0\.0 to 2\.0\.0/))
    })

    it('should preserve double quotes when present', async () => {
      fsStubs.readFileSync.returns(doubleQuoteIndexTsContent)
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: {}
      })

      await bumpCommand.run()

      const writtenContent = fsStubs.writeFileSync.firstCall.args[1]
      expect(writtenContent).to.include('version: "1.0.1"')
    })
  })

  describe('error cases', () => {
    it('should fail when connector directory does not exist', async () => {
      fsStubs.existsSync.withArgs(testDir).returns(false)
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: {}
      })

      try {
        await bumpCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.match(/Directory .* does not exist/)
      }
    })

    it('should fail when src/index.ts does not exist', async () => {
      fsStubs.existsSync.callsFake((path: fs.PathLike) => {
        const pathStr = String(path)
        // Connector directory exists, but index.ts does not
        if (pathStr.includes('index.ts')) return false
        return true
      })
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: {}
      })

      try {
        await bumpCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.match(/Could not find src\/index\.ts/)
      }
    })

    it('should fail when version field is missing', async () => {
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(missingVersionIndexTsContent)
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: {}
      })

      try {
        await bumpCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.match(/Could not find version field/)
      }
    })

    it('should fail when version is not valid semver', async () => {
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(invalidVersionIndexTsContent)
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: { path: testDir },
        flags: {}
      })

      try {
        await bumpCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.match(/not a valid semantic version/)
      }
    })
  })

  describe('with current directory default', () => {
    it('should use current directory when no path provided', async () => {
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(validIndexTsContent)
      sinon.stub(bumpCommand, 'parse' as any).resolves({
        args: {},
        flags: {}
      })

      await bumpCommand.run()

      expect(fsStubs.readFileSync).to.have.been.called
      expect(fsStubs.writeFileSync).to.have.been.called
    })
  })
})
