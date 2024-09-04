import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as fs from 'fs'
import * as createThemePackage from './createThemePackage'

describe('createThemePackage', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns an object containing a readStream and a removePackage method', async () => {
    const writeStreamStub = sinon.createStubInstance(fs.WriteStream)
    sinon.stub(fs, 'createWriteStream').returns(writeStreamStub)

    const readFileSync = sinon.createStubInstance(Buffer)
    sinon.stub(fs, 'readFileSync').returns(readFileSync)

    const unlinkSyncStub = sinon.stub(fs, 'unlinkSync')

    const createZipArchiveStub = sinon.stub(createThemePackage, 'createZipArchive')

    createZipArchiveStub.returns({
      pipe: sinon.stub(),
      directory: sinon.stub(),
      file: sinon.stub(),
      finalize: sinon.stub()
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const { file, removePackage } = await createThemePackage.default('theme/path')

    expect(file).to.instanceOf(Buffer)

    removePackage()
    expect(unlinkSyncStub.called).to.equal(true)
  })
})
