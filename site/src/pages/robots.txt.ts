import type { APIRoute } from 'astro'

export const GET: APIRoute = function GET() {
  // This project is served only as a proxy target behind chassis-ui.com.
  // Direct access via *.vercel.app should never be indexed by search engines.
  const robotsTxt = `# www.robotstxt.org
User-agent: *
Disallow: /
`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}
