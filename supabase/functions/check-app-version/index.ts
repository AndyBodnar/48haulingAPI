import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { current_version, platform } = await req.json()

    if (!current_version || !platform) {
      return new Response(JSON.stringify({ error: 'Missing current_version or platform' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get the latest version for this platform
    const { data: latestVersion, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .order('released_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error

    // Check if update is needed
    const needsUpdate = latestVersion.version_number !== current_version
    const forceUpdate = latestVersion.force_update && needsUpdate

    // Check if version is deprecated
    const isDeprecated = latestVersion.min_supported_version &&
      compareVersions(current_version, latestVersion.min_supported_version) < 0

    return new Response(JSON.stringify({
      latest_version: latestVersion.version_number,
      current_version,
      needs_update: needsUpdate,
      force_update: forceUpdate || isDeprecated,
      is_deprecated: isDeprecated,
      download_url: latestVersion.download_url,
      release_notes: latestVersion.release_notes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Simple version comparison function
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}
