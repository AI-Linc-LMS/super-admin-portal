// Netlify API integration service

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';
const NETLIFY_PAT = import.meta.env.VITE_NETLIFY_PAT;
const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT;

// Helper for Netlify API requests
async function netlifyRequest(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${NETLIFY_PAT}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(`${NETLIFY_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Check if a site exists by name (returns site or null)
export async function getSiteByName(name: string) {
  const sites = await netlifyRequest('/sites');
  return sites.find((site: any) => site.name === name) || null;
}

// Create a new site and set env vars
export async function createSite({ name, env }: {
  name: string;
  env: Record<string, string>;
}) {
  // Always use the required repo payload format
  const repoPayload = {
    provider: 'github',
    repo_url: 'https://github.com/AI-Linc-LMS/lms-platform-frontend.git',
    branch: 'main',
    private: true,
    auth: {
      access_token: import.meta.env.VITE_GITHUB_PAT,
    },
  };
  // Create site
  const site = await netlifyRequest('/sites', {
    method: 'POST',
    body: JSON.stringify({
      name,
      repo: repoPayload,
    }),
  });
  // Set env vars
  await netlifyRequest(`/sites/${site.id}/env`, {
    method: 'PATCH',
    body: JSON.stringify({
      env: Object.entries(env).map(([key, value]) => ({ key, value }))
    }),
  });
  return site;
}