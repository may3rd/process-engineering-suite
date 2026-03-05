/**
 * UoM preferences store for the venting calculator.
 *
 * Built with the shared `createUomStore` factory from `@eng-suite/engineering-units`.
 * User preferences are persisted to localStorage under the key 'vent-uom-prefs'.
 * Newly-added categories are automatically back-filled from BASE_UNITS on load.
 */

import { createUomStore } from '@eng-suite/engineering-units'
import { BASE_UNITS } from '../uom'

export const useUomStore = createUomStore('vent-uom-prefs', BASE_UNITS)
