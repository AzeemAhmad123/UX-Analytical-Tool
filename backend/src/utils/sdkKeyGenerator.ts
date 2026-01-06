import { randomBytes } from 'crypto'

/**
 * Generate a unique SDK key
 * Format: ux_<32-character-hex-string>
 * Example: ux_5359625f694d41eb869ae9474875cb7a
 */
export function generateSDKKey(): string {
  // Generate 16 random bytes (128 bits) and convert to hex (32 characters)
  const randomHex = randomBytes(16).toString('hex')
  return `ux_${randomHex}`
}

/**
 * Validate SDK key format
 */
export function isValidSDKKeyFormat(sdkKey: string): boolean {
  // Check if it matches the format: ux_<32-hex-chars>
  const sdkKeyPattern = /^ux_[a-f0-9]{32}$/i
  return sdkKeyPattern.test(sdkKey)
}

