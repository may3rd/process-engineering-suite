/**
 * UoM preferences store for the heat transfer calculator.
 *
 * Built with the shared `createUomStore` factory from `@eng-suite/engineering-units`.
 * User preferences are persisted to localStorage under the key 'heat-transfer-uom-prefs'.
 * Newly-added categories are automatically back-filled from BASE_UNITS on load.
 */

import { createUomStore } from '@eng-suite/engineering-units'
import { BASE_UNITS } from '../uom'

export const useUomStore = createUomStore('heat-transfer-uom-prefs', BASE_UNITS)
