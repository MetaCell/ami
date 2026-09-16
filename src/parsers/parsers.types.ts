/**
 * What loaders.volume.ts actually hands each format parser's constructor - a fetched file
 * (or, for the MHD/RAW pair, two files merged into one object - see ParserMHDData below).
 */
export interface ParserFileData {
  url: string;
  buffer: ArrayBuffer;
}
