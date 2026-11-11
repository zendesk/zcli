/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { isOSMetadataEntry, isAllowedAssetFile, isAllowedTranslationFile } from './bundleContract'

describe('bundleContract', () => {
  describe('isOSMetadataEntry', () => {
    it('should match macOS Finder metadata files', () => {
      expect(isOSMetadataEntry('.DS_Store')).to.be.true
    })

    it('should match AppleDouble sidecar files', () => {
      expect(isOSMetadataEntry('._logo.svg')).to.be.true
    })

    it('should match macOS ZIP extraction directories', () => {
      expect(isOSMetadataEntry('__MACOSX')).to.be.true
    })

    it('should not match other system files (reported as unexpected instead)', () => {
      expect(isOSMetadataEntry('Thumbs.db')).to.be.false
      expect(isOSMetadataEntry('desktop.ini')).to.be.false
    })

    it('should not match other dotfiles (reported as unexpected instead)', () => {
      expect(isOSMetadataEntry('.gitkeep')).to.be.false
      expect(isOSMetadataEntry('.env')).to.be.false
    })

    it('should not match regular files', () => {
      expect(isOSMetadataEntry('logo.svg')).to.be.false
      expect(isOSMetadataEntry('en.json')).to.be.false
      expect(isOSMetadataEntry('')).to.be.false
    })
  })

  describe('isAllowedAssetFile', () => {
    it('should allow the connector logo', () => {
      expect(isAllowedAssetFile('logo.svg')).to.be.true
    })

    it('should not allow other asset files', () => {
      expect(isAllowedAssetFile('icon.svg')).to.be.false
      expect(isAllowedAssetFile('logo.png')).to.be.false
      expect(isAllowedAssetFile('LOGO.SVG')).to.be.false
      expect(isAllowedAssetFile('notes.txt')).to.be.false
      expect(isAllowedAssetFile('.DS_Store')).to.be.false
    })
  })

  describe('isAllowedTranslationFile', () => {
    it('should allow JSON locale files', () => {
      expect(isAllowedTranslationFile('en.json')).to.be.true
      expect(isAllowedTranslationFile('en-us.json')).to.be.true
    })

    it('should not allow other files', () => {
      expect(isAllowedTranslationFile('en.JSON')).to.be.false
      expect(isAllowedTranslationFile('en.txt')).to.be.false
      expect(isAllowedTranslationFile('.DS_Store')).to.be.false
      expect(isAllowedTranslationFile('json')).to.be.false
    })
  })
})
