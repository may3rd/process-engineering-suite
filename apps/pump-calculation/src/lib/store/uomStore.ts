import { createUomStore } from '@eng-suite/engineering-units'
import { BASE_UNITS } from '../uom'

export const useUomStore = createUomStore('pump-uom-prefs', BASE_UNITS)
