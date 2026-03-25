import * as fs from 'fs'

export default function rewriteAssets (themePath: string, assets: Record<string, string>) {
  const assetsDir = `${themePath}/assets`

  try {
    fs.mkdirSync(assetsDir, { recursive: true })
  } catch (error) {
    // Ignore errors if directory can't be created
  }

  for (const [filename, base64Content] of Object.entries(assets)) {
    const filePath = `${assetsDir}/${filename}`

    try {
      fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'))
    } catch (error) {
      // Ignore errors if file can't be written
    }
  }
}
