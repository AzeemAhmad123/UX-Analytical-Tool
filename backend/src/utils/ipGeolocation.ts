/**
 * IP Geolocation utility
 * Uses free IP geolocation APIs to get location from IP address
 */

interface GeolocationResult {
  country?: string
  city?: string
  region?: string
  countryCode?: string
  latitude?: number
  longitude?: number
}

/**
 * Get geolocation from IP address using free APIs
 * Falls back to multiple services for reliability
 */
export async function getLocationFromIP(ipAddress: string): Promise<GeolocationResult> {
  if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
    // Local IP addresses - return default
    return {
      country: 'Unknown',
      city: 'Local',
      region: 'Local'
    }
  }

  // Try ipapi.co first (free tier: 1000 requests/day)
  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      method: 'GET',
      headers: {
        'User-Agent': 'UXCam-Analytics/1.0'
      },
      signal: AbortSignal.timeout(3000) // 3 second timeout
    })

    if (response.ok) {
      const data = await response.json() as {
        error?: boolean
        reason?: string
        country_name?: string
        country?: string
        city?: string
        region?: string
        region_code?: string
        country_code?: string
        latitude?: number
        longitude?: number
      }
      if (data.error) {
        throw new Error(data.reason || 'IP API error')
      }

      return {
        country: data.country_name || data.country || undefined,
        city: data.city || undefined,
        region: data.region || data.region_code || undefined,
        countryCode: data.country_code || undefined,
        latitude: data.latitude,
        longitude: data.longitude
      }
    }
  } catch (error: any) {
    // If timeout or error, try fallback
    if (error.name !== 'AbortError') {
      console.warn('ipapi.co geolocation failed, trying fallback:', error.message)
    }
  }

  // Fallback to ip-api.com (free tier: 45 requests/minute)
  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,region,regionName,lat,lon`, {
      method: 'GET',
      headers: {
        'User-Agent': 'UXCam-Analytics/1.0'
      },
      signal: AbortSignal.timeout(3000) // 3 second timeout
    })

    if (response.ok) {
      const data = await response.json() as {
        status?: string
        message?: string
        country?: string
        city?: string
        region?: string
        regionName?: string
        countryCode?: string
        lat?: number
        lon?: number
      }
      if (data.status === 'success') {
        return {
          country: data.country || undefined,
          city: data.city || undefined,
          region: data.regionName || data.region || undefined,
          countryCode: data.countryCode || undefined,
          latitude: data.lat,
          longitude: data.lon
        }
      }
    }
  } catch (error: any) {
    console.warn('ip-api.com geolocation failed:', error.message)
  }

  // If all services fail, return empty result
  return {}
}

/**
 * Extract device information from user agent string
 */
export function extractDeviceInfo(userAgent: string): {
  deviceType?: string
  deviceModel?: string
  os?: string
  browser?: string
} {
  const ua = userAgent.toLowerCase()
  const deviceInfo: any = {}

  // Detect device type
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    deviceInfo.deviceType = 'Mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceInfo.deviceType = 'Tablet'
  } else {
    deviceInfo.deviceType = 'Desktop'
  }

  // Detect OS
  if (ua.includes('android')) {
    const androidVersion = ua.match(/android\s([0-9\.]*)/)
    deviceInfo.os = `Android ${androidVersion ? androidVersion[1] : ''}`.trim()
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    const iosVersion = ua.match(/os\s([0-9_]*)/)
    deviceInfo.os = `iOS ${iosVersion ? iosVersion[1].replace(/_/g, '.') : ''}`.trim()
  } else if (ua.includes('windows')) {
    deviceInfo.os = 'Windows'
  } else if (ua.includes('mac')) {
    deviceInfo.os = 'macOS'
  } else if (ua.includes('linux')) {
    deviceInfo.os = 'Linux'
  }

  // Detect device model
  if (ua.includes('iphone')) {
    const iphoneMatch = ua.match(/iphone\s?(\d+)/i)
    deviceInfo.deviceModel = iphoneMatch ? `iPhone ${iphoneMatch[1]}` : 'iPhone'
  } else if (ua.includes('ipad')) {
    deviceInfo.deviceModel = 'iPad'
  } else if (ua.includes('samsung')) {
    const samsungMatch = ua.match(/samsung[\/\s]([a-z0-9-]+)/i)
    deviceInfo.deviceModel = samsungMatch ? `Samsung ${samsungMatch[1]}` : 'Samsung'
  } else if (ua.includes('pixel')) {
    const pixelMatch = ua.match(/pixel\s?(\d+)/i)
    deviceInfo.deviceModel = pixelMatch ? `Pixel ${pixelMatch[1]}` : 'Pixel'
  }

  // Detect browser
  if (ua.includes('chrome') && !ua.includes('edg')) {
    deviceInfo.browser = 'Chrome'
  } else if (ua.includes('firefox')) {
    deviceInfo.browser = 'Firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    deviceInfo.browser = 'Safari'
  } else if (ua.includes('edg')) {
    deviceInfo.browser = 'Edge'
  } else if (ua.includes('opera') || ua.includes('opr')) {
    deviceInfo.browser = 'Opera'
  }

  return deviceInfo
}
