export async function sleepTime(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  export function chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
      array.slice(i * size, i * size + size)
    );
  }
  
  export function bufferFromUInt64(value: number | string) {
    let buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  }
  
  export function readBigUintLE(
    buf: Buffer,
    offset: number,
    length: number
  ): number {
    switch (length) {
      case 1:
        return buf.readUint8(offset);
      case 2:
        return buf.readUint16LE(offset);
      case 4:
        return buf.readUint32LE(offset);
      case 8:
        return Number(buf.readBigUint64LE(offset));
    }
    throw new Error(`unsupported data size (${length} bytes)`);
  }
  
  