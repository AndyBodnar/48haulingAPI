"use client"
import dynamic from 'next/dynamic'
import React from 'react'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsPage() {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <SwaggerUI url="/openapi.yaml" docExpansion="list" defaultModelsExpandDepth={1} />
    </div>
  )
}

