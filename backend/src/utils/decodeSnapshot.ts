import { gunzipSync } from 'zlib'
import * as LZString from 'lz-string'

/**
 * Decode snapshot data from database (handles multiple formats)
 * @param snapshotData - Buffer, Uint8Array, or string (hex BYTEA or JSON)
 * @returns Flat array of rrweb events, or null if decode fails
 */
export function decodeSnapshot(snapshotData: Buffer | Uint8Array | string): any[] | null {
  try {
    let buffer: Buffer

    // Step 1: Convert input to Buffer, handling hex BYTEA format first
    if (typeof snapshotData === 'string') {
      // Handle Supabase hex BYTEA format (\x...)
      if (snapshotData.length >= 2 && 
          snapshotData.charCodeAt(0) === 92 && // backslash
          snapshotData.charCodeAt(1) === 120) { // x
        const hexString = snapshotData.substring(2) // Remove \x prefix
        buffer = Buffer.from(hexString, 'hex')
        console.log(`📦 Decoding hex BYTEA (${hexString.length / 2} bytes)`)
      } else {
        // Try direct JSON parse first (fastest path for plain JSON)
        try {
          const trimmed = snapshotData.trim()
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed)
            return flattenEvents(parsed)
          }
        } catch {
          // Not plain JSON, continue to other methods
        }
        
        // Try LZString decompression on the string directly (before converting to Buffer)
        try {
          const decompressed = LZString.decompress(snapshotData)
          if (decompressed && decompressed.length > 0) {
            const parsed = JSON.parse(decompressed)
            console.log('✅ Successfully LZString decompressed from string')
            return flattenEvents(parsed)
          }
        } catch {
          // LZString failed, continue to Buffer conversion
        }
        
        // Try parsing as JSON Buffer object
        try {
          const parsed = JSON.parse(snapshotData)
          if (parsed && parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
            buffer = Buffer.from(parsed.data)
            console.log(`📦 Decoding JSON Buffer object (${parsed.data.length} bytes)`)
          } else {
            // Not a Buffer object, convert to Buffer using latin1 (preserves binary data)
            buffer = Buffer.from(snapshotData, 'latin1')
            console.log(`📦 Converting string to Buffer (latin1, ${buffer.length} bytes)`)
          }
        } catch {
          // Not JSON, convert to Buffer using latin1
          buffer = Buffer.from(snapshotData, 'latin1')
          console.log(`📦 Converting non-JSON string to Buffer (latin1, ${buffer.length} bytes)`)
        }
      }
    } else if (snapshotData instanceof Uint8Array) {
      buffer = Buffer.from(snapshotData)
      console.log(`📦 Decoding Uint8Array (${buffer.length} bytes)`)
    } else if (Buffer.isBuffer(snapshotData)) {
      buffer = snapshotData
      console.log(`📦 Decoding Buffer (${buffer.length} bytes)`)
    } else {
      console.error('❌ Unknown snapshot data type:', typeof snapshotData)
      return null
    }


    // Step 2: Try gzip decompression (most common for rrweb)
    try {
      const decompressed = gunzipSync(buffer)
      const jsonString = decompressed.toString('utf8')
      const parsed = JSON.parse(jsonString)
      console.log('✅ Successfully gunzipped and parsed snapshot')
      return flattenEvents(parsed)
    } catch (gzipError: any) {
      // Gzip failed - log buffer preview to see if it's hex or plain text
      const bufferPreview = buffer.slice(0, 20).toString('latin1').replace(/[^\x20-\x7E]/g, '.')
      const bufferHex = buffer.slice(0, 20).toString('hex')
      console.log('⚠️ Gzip decompression failed, trying LZString...', {
        bufferPreview,
        bufferHex,
        bufferLength: buffer.length
      })
    }

    // Step 3: Try LZString decompression (SDK sends LZString-compressed data)
    try {
      // Convert buffer to string using latin1 to preserve binary data
      // This is critical: LZString uses binary-safe encoding, so we must use latin1
      const stringData = buffer.toString('latin1')
      const decompressed = LZString.decompress(stringData)
      if (decompressed && decompressed.length > 0) {
        const parsed = JSON.parse(decompressed)
        console.log('✅ Successfully LZString decompressed and parsed snapshot')
        return flattenEvents(parsed)
      } else {
        console.log('⚠️ LZString decompression returned empty or null')
      }
    } catch (lzError: any) {
      console.log('⚠️ LZString decompression failed:', lzError.message)
    }

    // Step 4: Try direct JSON parse (for plain JSON strings)
    try {
      const stringData = buffer.toString('latin1')
      if (stringData.trim().startsWith('[') || stringData.trim().startsWith('{')) {
        const parsed = JSON.parse(stringData)
        console.log('✅ Successfully parsed as plain JSON')
        return flattenEvents(parsed)
      }
    } catch (jsonError: any) {
      // All methods failed
      console.error('❌ Failed to decode snapshot with all methods:', {
        bufferLength: buffer.length,
        bufferStartHex: buffer.slice(0, 20).toString('hex'),
        bufferStartUTF8: buffer.slice(0, 100).toString('latin1').replace(/[^\x20-\x7E]/g, '.')
      })
      return null
    }
    
    return null
  } catch (error: any) {
    console.error('❌ Failed to decode snapshot:', error.message, error.stack)
    return null
  }
}

/**
 * Flatten events to ensure we always return a flat array
 * Handles nested arrays, single objects, and mixed formats
 */
function flattenEvents(data: any): any[] {
  if (!data) return []
  
  // If it's already a flat array of events, return it
  if (Array.isArray(data)) {
    const flattened: any[] = []
    for (const item of data) {
      if (Array.isArray(item)) {
        // Nested array - flatten recursively
        flattened.push(...flattenEvents(item))
      } else if (item && typeof item === 'object' && typeof item.type === 'number') {
        // Valid rrweb event
        flattened.push(item)
      }
    }
    return flattened
  }
  
  // Single object - wrap in array
  if (data && typeof data === 'object' && typeof data.type === 'number') {
    return [data]
  }
  
  // Unknown format - return empty array
  console.warn('⚠️ Unknown event format, returning empty array')
  return []
}
