import { supabase } from '../config/supabase'
import * as LZString from 'lz-string'

export interface SnapshotData {
  id: string
  session_id: string
  snapshot_data: Buffer | Uint8Array
  snapshot_count: number
  is_initial_snapshot: boolean
  created_at: string
}

/**
 * Store snapshot data in database
 * snapshotData can be:
 * - Compressed string (LZString)
 * - JSON string
 * - Buffer/Uint8Array
 */
export async function storeSnapshot(
  sessionDbId: string,
  snapshotData: string | Buffer | Uint8Array,
  snapshotCount: number,
  isInitial: boolean = false,
  projectId?: string // Add projectId parameter
): Promise<SnapshotData> {
  try {
    console.log('📦 storeSnapshot called', {
      sessionDbId,
      snapshotDataType: typeof snapshotData,
      snapshotDataLength: typeof snapshotData === 'string' ? snapshotData.length : 'N/A',
      snapshotCount,
      isInitial
    })
    
    // Convert to Buffer if needed
    let buffer: Buffer
    if (typeof snapshotData === 'string') {
      // If it's a string, convert to Buffer (UTF-8 encoding)
      buffer = Buffer.from(snapshotData, 'utf8')
      console.log('✅ Converted string to buffer', { bufferLength: buffer.length })
    } else if (snapshotData instanceof Uint8Array) {
      buffer = Buffer.from(snapshotData)
      console.log('✅ Converted Uint8Array to buffer', { bufferLength: buffer.length })
    } else {
      buffer = snapshotData
      console.log('✅ Using buffer as-is', { bufferLength: buffer.length })
    }

    console.log('📤 Inserting into database...')
    
    // Get project_id from session if not provided
    let finalProjectId = projectId
    if (!finalProjectId) {
      try {
        const { data: sessionData, error: sessionError } = await Promise.race([
          supabase
            .from('sessions')
            .select('project_id')
            .eq('id', sessionDbId)
            .single(),
          new Promise<{ data: any, error: any }>((_, reject) => 
            setTimeout(() => reject(new Error('Session query timeout')), 10000) // 10 second timeout
          )
        ])
        
        if (sessionError) {
          console.warn('⚠️ Error fetching project_id from session:', sessionError.message)
        } else if (sessionData) {
          finalProjectId = sessionData.project_id
          console.log('✅ Fetched project_id from session:', finalProjectId)
        }
      } catch (timeoutError: any) {
        console.warn('⚠️ Timeout fetching project_id from session, proceeding without it')
      }
    }
    
    // Build insert object
    const insertData: any = {
      session_id: sessionDbId,
      snapshot_data: buffer, // Supabase will handle BYTEA conversion
      snapshot_count: snapshotCount,
      is_initial_snapshot: isInitial
    }
    
    // Add project_id if available (required by database)
    if (finalProjectId) {
      insertData.project_id = finalProjectId
      console.log('✅ Including project_id in insert:', finalProjectId)
    } else {
      console.warn('⚠️ No project_id available for snapshot insert')
    }
    
    // Insert with timeout handling
    let { data: snapshot, error } = await Promise.race([
      supabase
        .from('session_snapshots')
        .insert(insertData)
        .select()
        .single(),
      new Promise<{ data: any, error: any }>((_, reject) => 
        setTimeout(() => reject(new Error('upstream request timeout')), 30000) // 30 second timeout
      )
    ]).catch((timeoutError: any) => {
      // If timeout, return error object
      return { data: null, error: { message: timeoutError.message || 'upstream request timeout' } }
    })
    
    // If error is about missing column, retry without optional columns
    if (error && error.message) {
      const errorMsg = error.message.toLowerCase()
      
      // Handle missing is_initial_snapshot column
      if (errorMsg.includes('is_initial_snapshot')) {
        console.log('⚠️ Column is_initial_snapshot missing, retrying without it...')
        const insertDataWithoutColumn: any = {
          session_id: sessionDbId,
          snapshot_data: buffer,
          snapshot_count: snapshotCount
        }
        
        if (finalProjectId) {
          insertDataWithoutColumn.project_id = finalProjectId
        }
        
        const retryResult = await supabase
          .from('session_snapshots')
          .insert(insertDataWithoutColumn)
          .select()
          .single()
        
        if (retryResult.error) {
          error = retryResult.error
        } else {
          snapshot = retryResult.data
          error = null
          console.log('✅ Snapshot inserted successfully (without is_initial_snapshot column)')
          console.log('⚠️ Please run the migration to add the missing column:')
          console.log('   See: backend/database/fix_schema.sql')
        }
      }
      // Handle missing project_id column
      else if (errorMsg.includes('project_id') || errorMsg.includes('column') && errorMsg.includes('project')) {
        console.log('⚠️ Column project_id missing, retrying without it...')
        const insertDataWithoutProjectId: any = {
          session_id: sessionDbId,
          snapshot_data: buffer,
          snapshot_count: snapshotCount,
          is_initial_snapshot: isInitial
        }
        
        const retryResult = await supabase
          .from('session_snapshots')
          .insert(insertDataWithoutProjectId)
          .select()
          .single()
        
        if (retryResult.error) {
          error = retryResult.error
        } else {
          snapshot = retryResult.data
          error = null
          console.log('✅ Snapshot inserted successfully (without project_id column)')
          console.log('⚠️ Please run the migration to add project_id column:')
          console.log('   See: backend/database/add_project_id_to_snapshots.sql')
        }
      }
    }

    if (error) {
      console.error('❌ Supabase insert error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        insertDataKeys: Object.keys(insertData),
        hasProjectId: !!insertData.project_id
      })
      
      // Provide more helpful error message
      let errorMessage = `Failed to store snapshot: ${error.message}`
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        errorMessage += '\n\n💡 TIP: You may need to run database migrations:'
        errorMessage += '\n   - backend/database/add_project_id_to_snapshots.sql'
        errorMessage += '\n   - backend/database/fix_schema.sql'
      }
      
      throw new Error(errorMessage)
    }
    
    if (!snapshot) {
      console.error('❌ No snapshot returned from insert')
      throw new Error('Failed to store snapshot: No data returned')
    }

    console.log('✅ Snapshot inserted successfully', { snapshotId: snapshot.id })
    return snapshot as SnapshotData
  } catch (error: any) {
    console.error('❌ Error in storeSnapshot:', error)
    console.error('Error stack:', error.stack)
    throw error
  }
}

/**
 * Get all snapshots for a session, ordered by creation time
 * Returns decompressed snapshot data as strings
 */
/**
 * Get first and last event timestamps from snapshots (for duration calculation)
 * This is faster than decompressing all snapshots
 */
export async function getSessionDurationFromSnapshots(sessionDbId: string): Promise<number | null> {
  try {
    const { data: snapshots, error } = await supabase
      .from('session_snapshots')
      .select('snapshot_data, snapshot_count')
      .eq('session_id', sessionDbId)
      .order('created_at', { ascending: true })

    if (error || !snapshots || snapshots.length === 0) {
      return null
    }

    // Get first and last snapshots only (to calculate duration quickly)
    const firstSnapshot = snapshots[0]
    const lastSnapshot = snapshots[snapshots.length - 1]
    
    let firstTimestamp: number | null = null
    let lastTimestamp: number | null = null

    // Try to get timestamp from first snapshot
    try {
      let firstData: any = firstSnapshot.snapshot_data
      
      // Handle Supabase BYTEA format - check for hex format first (\x...)
      if (typeof firstData === 'string' && firstData.length >= 2 && 
          firstData.charCodeAt(0) === 92 && firstData.charCodeAt(1) === 120) {
        // Hex BYTEA format (\x...)
        const hexString = firstData.substring(2) // Remove \x prefix
        try {
          firstData = Buffer.from(hexString, 'hex').toString('utf8')
          console.log(`✅ Converted hex BYTEA to string for first snapshot (${hexString.length / 2} bytes)`)
        } catch (e) {
          console.warn('Error converting hex BYTEA:', e)
          return null
        }
      } else if (firstData && typeof firstData === 'object' && firstData.type === 'Buffer' && Array.isArray(firstData.data)) {
        // JSON-serialized Buffer object
        firstData = Buffer.from(firstData.data).toString('utf8')
      } else if (Buffer.isBuffer(firstData)) {
        firstData = firstData.toString('utf8')
      } else if (typeof firstData !== 'string') {
        firstData = String(firstData)
      }

      // Try decompression first
      const decompressed = LZString.decompress(firstData)
      const parsed = decompressed && decompressed.length > 0 ? JSON.parse(decompressed) : JSON.parse(firstData)
      
      // Handle different data structures
      let events: any[] = []
      if (Array.isArray(parsed)) {
        events = parsed
        // Handle double-wrapped arrays
        if (events.length === 1 && Array.isArray(events[0])) {
          events = events[0]
        }
      } else if (parsed && typeof parsed === 'object') {
        events = [parsed]
      }
      
      // Find first event with timestamp
      for (const event of events) {
        if (event && event.timestamp && typeof event.timestamp === 'number') {
          firstTimestamp = event.timestamp
          break
        }
      }
    } catch (e) {
      console.warn('Error extracting first timestamp:', e)
    }

    // Try to get timestamp from last snapshot
    try {
      let lastData: any = lastSnapshot.snapshot_data
      
      // Handle Supabase BYTEA format - check for hex format first (\x...)
      if (typeof lastData === 'string' && lastData.length >= 2 && 
          lastData.charCodeAt(0) === 92 && lastData.charCodeAt(1) === 120) {
        // Hex BYTEA format (\x...)
        const hexString = lastData.substring(2) // Remove \x prefix
        try {
          lastData = Buffer.from(hexString, 'hex').toString('utf8')
          console.log(`✅ Converted hex BYTEA to string for last snapshot (${hexString.length / 2} bytes)`)
        } catch (e) {
          console.warn('Error converting hex BYTEA:', e)
          return null
        }
      } else if (lastData && typeof lastData === 'object' && lastData.type === 'Buffer' && Array.isArray(lastData.data)) {
        // JSON-serialized Buffer object
        lastData = Buffer.from(lastData.data).toString('utf8')
      } else if (Buffer.isBuffer(lastData)) {
        lastData = lastData.toString('utf8')
      } else if (typeof lastData !== 'string') {
        lastData = String(lastData)
      }

      // Try decompression first
      const decompressed = LZString.decompress(lastData)
      const parsed = decompressed && decompressed.length > 0 ? JSON.parse(decompressed) : JSON.parse(lastData)
      
      // Handle different data structures
      let events: any[] = []
      if (Array.isArray(parsed)) {
        events = parsed
        // Handle double-wrapped arrays
        if (events.length === 1 && Array.isArray(events[0])) {
          events = events[0]
        }
      } else if (parsed && typeof parsed === 'object') {
        events = [parsed]
      }
      
      // Find last event with timestamp (iterate backwards)
      for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i]
        if (event && event.timestamp && typeof event.timestamp === 'number') {
          lastTimestamp = event.timestamp
          break
        }
      }
    } catch (e) {
      console.warn('Error extracting last timestamp:', e)
    }

    if (firstTimestamp && lastTimestamp && lastTimestamp > firstTimestamp) {
      return lastTimestamp - firstTimestamp
    }

    return null
  } catch (error: any) {
    console.error('Error calculating duration from snapshots:', error)
    return null
  }
}

export async function getSessionSnapshots(sessionDbId: string): Promise<Array<{
  id: string
  snapshot_data: string
  snapshot_count: number
  is_initial_snapshot: boolean
  created_at: string
}>> {
  try {
    const { data: snapshots, error } = await supabase
      .from('session_snapshots')
      .select('id, snapshot_data, snapshot_count, is_initial_snapshot, created_at')
      .eq('session_id', sessionDbId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to retrieve snapshots: ${error.message}`)
    }

    if (!snapshots || snapshots.length === 0) {
      return []
    }

    // Convert BYTEA to string
    // Supabase returns BYTEA as a hex string, Buffer, or Uint8Array
    const processedSnapshots = snapshots.map((snapshot: any) => {
      let snapshotData: string

      if (Buffer.isBuffer(snapshot.snapshot_data)) {
        snapshotData = snapshot.snapshot_data.toString('utf8')
      } else if (snapshot.snapshot_data instanceof Uint8Array) {
        // Convert Uint8Array to string
        snapshotData = Buffer.from(snapshot.snapshot_data).toString('utf8')
      } else if (typeof snapshot.snapshot_data === 'string') {
        // If it's already a string, use it directly
        snapshotData = snapshot.snapshot_data
      } else if (snapshot.snapshot_data && typeof snapshot.snapshot_data === 'object') {
        // Handle Buffer object format: {type: "Buffer", data: [array of bytes]}
        try {
          if (snapshot.snapshot_data.type === 'Buffer' && Array.isArray(snapshot.snapshot_data.data)) {
            // This is a JSON-serialized Buffer object
            // Convert the byte array back to a Buffer, then to string
            const buffer = Buffer.from(snapshot.snapshot_data.data)
            snapshotData = buffer.toString('utf8')
            console.log(`✅ Converted Buffer object to string (${buffer.length} bytes)`)
          } else if (snapshot.snapshot_data.data) {
            // Handle Supabase's hex format
            const hexString = snapshot.snapshot_data.data
            if (typeof hexString === 'string' && hexString.startsWith('\\x')) {
              // PostgreSQL hex format: \x...
              const hex = hexString.slice(2) // Remove \x prefix
              snapshotData = Buffer.from(hex, 'hex').toString('utf8')
            } else if (Array.isArray(hexString)) {
              // If data is an array of numbers (bytes), convert to Buffer
              snapshotData = Buffer.from(hexString).toString('utf8')
            } else {
              snapshotData = Buffer.from(hexString, 'hex').toString('utf8')
            }
          } else {
            // Try to stringify and parse
            snapshotData = JSON.stringify(snapshot.snapshot_data)
          }
        } catch (e) {
          console.error('Error converting snapshot data:', e)
          snapshotData = String(snapshot.snapshot_data)
        }
      } else if (typeof snapshot.snapshot_data === 'string') {
        // Check if string is a JSON-serialized Buffer object
        try {
          const parsed = JSON.parse(snapshot.snapshot_data)
          if (parsed && parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
            // This is a JSON string containing a Buffer object
            const buffer = Buffer.from(parsed.data)
            snapshotData = buffer.toString('utf8')
            console.log(`✅ Converted JSON Buffer string to actual string (${buffer.length} bytes)`)
          } else {
            // Not a Buffer object, use as-is
            snapshotData = snapshot.snapshot_data
          }
        } catch (e) {
          // Not valid JSON, use as-is
          snapshotData = snapshot.snapshot_data
        }
      } else {
        // Try to convert from hex or other formats
        snapshotData = String(snapshot.snapshot_data)
      }

      return {
        id: snapshot.id,
        snapshot_data: snapshotData,
        snapshot_count: snapshot.snapshot_count,
        is_initial_snapshot: snapshot.is_initial_snapshot,
        created_at: snapshot.created_at
      }
    })

    return processedSnapshots
  } catch (error: any) {
    console.error('Error in getSessionSnapshots:', error)
    throw error
  }
}

/**
 * Parse snapshot data (handles LZString compression if needed)
 * The SDK sends compressed data, but we'll try to parse it as JSON first
 * If that fails, we'll assume it needs decompression (will be handled in routes)
 */
export function parseSnapshotData(snapshotData: string): any {
  try {
    // Try to parse as JSON first
    return JSON.parse(snapshotData)
  } catch (error) {
    // If parsing fails, return the raw string
    // The route handler will handle decompression if needed
    return snapshotData
  }
}

