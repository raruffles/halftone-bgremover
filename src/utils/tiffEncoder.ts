/**
 * Standard Little-Endian TIFF Encoder for RGBA with Alpha Transparency & 300 DPI metadata
 * Generates valid .tiff / .tif binary files supported by Photoshop, Illustrator, CorelDRAW, and print rips.
 */
export function encodeTiff(
  imageData: ImageData,
  dpi: number = 300
): Uint8Array {
  const width = imageData.width;
  const height = imageData.height;
  const rgbaData = imageData.data;

  // Header: 8 bytes
  // IFD: 2 bytes (count) + 14 tags * 12 bytes + 4 bytes (offset to next IFD = 0) = 174 bytes
  // Tag payload area (BitsPerSample, XResolution, YResolution): 4 * 2 + 8 + 8 = 24 bytes
  // Strip offset points right after header + IFD + payloads
  const numTags = 14;
  const ifdOffset = 8;
  const ifdSize = 2 + numTags * 12 + 4;
  const payloadOffset = ifdOffset + ifdSize;

  const bitsPerSampleOffset = payloadOffset; // 8 bytes (4 shorts: 8, 8, 8, 8)
  const xResOffset = bitsPerSampleOffset + 8; // 8 bytes (2 longs: 300, 1)
  const yResOffset = xResOffset + 8; // 8 bytes (2 longs: 300, 1)
  const stripOffset = yResOffset + 8;

  const pixelByteCount = width * height * 4;
  const totalFileSize = stripOffset + pixelByteCount;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // 1. TIFF Header (Little-Endian 'II')
  view.setUint16(0, 0x4949, false); // 'II'
  view.setUint16(2, 42, true);       // Magic 42
  view.setUint32(4, ifdOffset, true); // Offset to 1st IFD

  // 2. IFD count
  let p = ifdOffset;
  view.setUint16(p, numTags, true);
  p += 2;

  // Helper to write a 12-byte IFD tag
  const writeTag = (
    tagId: number,
    type: number, // 3 = SHORT, 4 = LONG, 5 = RATIONAL
    count: number,
    valueOrOffset: number
  ) => {
    view.setUint16(p, tagId, true);
    view.setUint16(p + 2, type, true);
    view.setUint32(p + 4, count, true);
    view.setUint32(p + 8, valueOrOffset, true);
    p += 12;
  };

  // Tags sorted in ascending numeric order (required by TIFF specification)
  writeTag(0x0100, 4, 1, width);                          // ImageWidth (LONG)
  writeTag(0x0101, 4, 1, height);                         // ImageLength (LONG)
  writeTag(0x0102, 3, 4, bitsPerSampleOffset);            // BitsPerSample (4 shorts -> payload)
  writeTag(0x0103, 3, 1, 1);                              // Compression: 1 = None (SHORT)
  writeTag(0x0106, 3, 1, 2);                              // PhotometricInterpretation: 2 = RGB (SHORT)
  writeTag(0x0111, 4, 1, stripOffset);                    // StripOffsets (LONG)
  writeTag(0x0112, 3, 1, 1);                              // Orientation: 1 = TopLeft (SHORT)
  writeTag(0x0115, 3, 1, 4);                              // SamplesPerPixel: 4 = RGBA (SHORT)
  writeTag(0x0116, 4, 1, height);                         // RowsPerStrip (LONG)
  writeTag(0x0117, 4, 1, pixelByteCount);                 // StripByteCounts (LONG)
  writeTag(0x011A, 5, 1, xResOffset);                     // XResolution (RATIONAL -> payload)
  writeTag(0x011B, 5, 1, yResOffset);                     // YResolution (RATIONAL -> payload)
  writeTag(0x0128, 3, 1, 2);                              // ResolutionUnit: 2 = Inch (SHORT)
  writeTag(0x0152, 3, 1, 2);                              // ExtraSamples: 2 = Unassociated alpha (SHORT)

  // Offset to next IFD: 0
  view.setUint32(p, 0, true);

  // 3. Write Payloads
  // BitsPerSample (4 x SHORT 8)
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  view.setUint16(bitsPerSampleOffset + 6, 8, true);

  // XResolution: dpi / 1
  view.setUint32(xResOffset, dpi, true);
  view.setUint32(xResOffset + 4, 1, true);

  // YResolution: dpi / 1
  view.setUint32(yResOffset, dpi, true);
  view.setUint32(yResOffset + 4, 1, true);

  // 4. Write Pixel Data (RGBA)
  bytes.set(rgbaData, stripOffset);

  return bytes;
}

/**
 * Creates a downloadable Blob for TIFF
 */
export function createTiffBlob(imageData: ImageData, dpi: number = 300): Blob {
  const bytes = encodeTiff(imageData, dpi);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/tiff' });
}
