/**
 * Next.js Integration Example
 * Add this to your Next.js app for UXCam analytics
 */

// Option 1: Using _document.tsx (Pages Router)
// pages/_document.tsx

import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Load rrweb for visual session replay */}
        <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js" />
        
        {/* UXCam SDK Configuration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.UXCamSDK = {
                key: '${process.env.NEXT_PUBLIC_UXCAM_SDK_KEY}',
                apiUrl: '${process.env.NEXT_PUBLIC_UXCAM_API_URL || 'http://localhost:3001'}'
              };
            `
          }}
        />
        
        {/* Load UXCam SDK */}
        <script src="/uxcam-sdk-rrweb.js" async />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

// Option 2: Using layout.tsx (App Router)
// app/layout.tsx

import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Your App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js" strategy="beforeInteractive" />
        <Script
          id="uxcam-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.UXCamSDK = {
                key: '${process.env.NEXT_PUBLIC_UXCAM_SDK_KEY}',
                apiUrl: '${process.env.NEXT_PUBLIC_UXCAM_API_URL || 'http://localhost:3001'}'
              };
            `
          }}
        />
        <Script src="/uxcam-sdk-rrweb.js" strategy="afterInteractive" />
      </head>
      <body>{children}</body>
    </html>
  )
}

// Option 3: Using a Component (Recommended)
// components/UXCamAnalytics.tsx

'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export function UXCamAnalytics() {
  useEffect(() => {
    // SDK will auto-initialize when script loads
  }, [])

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js" 
        strategy="beforeInteractive" 
      />
      <Script
        id="uxcam-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.UXCamSDK = {
              key: '${process.env.NEXT_PUBLIC_UXCAM_SDK_KEY}',
              apiUrl: '${process.env.NEXT_PUBLIC_UXCAM_API_URL || 'http://localhost:3001'}'
            };
          `
        }}
      />
      <Script 
        src="/uxcam-sdk-rrweb.js" 
        strategy="afterInteractive" 
      />
    </>
  )
}

// Then use in app/layout.tsx:
// import { UXCamAnalytics } from '@/components/UXCamAnalytics'
// 
// export default function RootLayout({ children }) {
//   return (
//     <html>
//       <body>
//         <UXCamAnalytics />
//         {children}
//       </body>
//     </html>
//   )
// }

