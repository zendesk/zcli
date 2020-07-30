import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

const access = util.promisify(fs.access)

export const getAppPaths = (appDirectories: string[]): string[] => {
  // set default as current dir
  if (appDirectories.length === 0) appDirectories.push('.')

  const appPaths = appDirectories.map((dirName: string) => path.resolve(dirName))
  appPaths.forEach((dirPath: string) => {
    access(dirPath).catch(err => {
      console.error(err.message)
    })
  })

  return appPaths
}
