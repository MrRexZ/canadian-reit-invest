// NOTE: The local createCodamaConfig is a temporary workaround until gill ships the fix for https://github.com/gillsdk/gill/issues/207
// Future versions can "import { createCodamaConfig } from 'gill'" directly
import { createCodamaConfig } from './anchor/src/create-codama-config.js'

export default createCodamaConfig({
  clientJs: 'src/generated',
  idl: 'src/idl/canadianreitinvest.json',
})
