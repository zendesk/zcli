/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import { isSystemFile } from './systemFiles'

describe('isSystemFile', () => {
  describe('system files', () => {
    it('should match macOS Finder metadata files', () => {
      expect(isSystemFile('.DS_Store')).to.be.true
    })

    it('should match dotfiles and dot-directories', () => {
      expect(isSystemFile('.git')).to.be.true
      expect(isSystemFile('.localized')).to.be.true
    })

    it('should match AppleDouble files', () => {
      expect(isSystemFile('._logo.svg')).to.be.true
    })

    it('should match Windows system files case-insensitively', () => {
      expect(isSystemFile('Thumbs.db')).to.be.true
      expect(isSystemFile('ehthumbs.db')).to.be.true
      expect(isSystemFile('DESKTOP.INI')).to.be.true
    })

    it('should match editor backup files', () => {
      expect(isSystemFile('logo.svg~')).to.be.true
    })

    it('should match editor swap files', () => {
      expect(isSystemFile('logo.svg.swp')).to.be.true
      expect(isSystemFile('logo.svg.SWO')).to.be.true
    })

    it('should match temp and backup extension files', () => {
      expect(isSystemFile('logo.tmp')).to.be.true
      expect(isSystemFile('logo.bak')).to.be.true
    })

    it('should match Emacs autosave files', () => {
      expect(isSystemFile('#logo.svg#')).to.be.true
    })
  })

  describe('regular files', () => {
    it('should not match regular asset files', () => {
      expect(isSystemFile('logo.svg')).to.be.false
    })

    it('should not match regular translation files', () => {
      expect(isSystemFile('en.json')).to.be.false
    })

    it('should not match directory names', () => {
      expect(isSystemFile('subdir')).to.be.false
    })

    it('should not match empty names', () => {
      expect(isSystemFile('')).to.be.false
    })
  })
})
