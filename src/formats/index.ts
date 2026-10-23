/**
 * Interchange formats (ticket 10): Jellyfish .mat for whole matches and XGID
 * for single positions. The app's UI imports formats from here; the XGID
 * implementation itself lives beside the engine (src/engine/xgid.ts), which
 * uses it to drive gnubg.
 */

export {
  type DecodedXgid,
  decodeXgid,
  type EncodeXgidOptions,
  encodeXgid,
} from '../engine/xgid';
export { CopyXgidButton } from './CopyXgidButton';
export { importedStoredMatch } from './imported';
export {
  exportMat,
  importMat,
  type MatImport,
  MatParseError,
  type MatPlayers,
} from './mat';
