// NOTE: The local createCodamaConfig is a temporary workaround until gill ships the fix for https://github.com/gillsdk/gill/issues/207
// Future versions can "import { createCodamaConfig } from 'gill'" directly
import { createCodamaConfig } from './src/create-codama-config.js'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default createCodamaConfig({
  clientJs: resolve(__dirname, '../src/generated'),
  idl: resolve(__dirname, '../src/idl/canadianreitinvest.json'),
})
