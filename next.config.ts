import type { NextConfig } from "next";

// Read raw base path from env (default to '/').
const rawBasePath = process.env.BASE_PATH ?? '/';

function normalizeBasePath(input: string): string {
	if (!input) return '/';
	let p = input;
	// ensure leading slash
	if (!p.startsWith('/')) p = '/' + p;
	// remove trailing slash if present (but keep single '/' for root)
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
	return p;
}

const normalizedBasePath = normalizeBasePath(rawBasePath);
// Next.js basePath should be an empty string for root, otherwise the normalized path
const nextBasePath = normalizedBasePath === '/' ? '' : normalizedBasePath;
// headers source should include the base path prefix when it's not root
const authHeadersSource = normalizedBasePath === '/' ? '/api/auth/:path*' : `${normalizedBasePath}/api/auth/:path*`;

const nextConfig: NextConfig = {
	/* config options here */
	output: 'standalone',
	basePath: nextBasePath,
	assetPrefix: nextBasePath,
	async headers() {
		return [
			{
				source: authHeadersSource,
				headers: [
					{ key: 'Access-Control-Allow-Credentials', value: 'true' },
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{ key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
					{
						key: 'Access-Control-Allow-Headers',
						value: 'X-CSRF-Token, X-Requested-With, x-auth-request-user, x-auth-request-email, x-auth-request-preferred-username, X-Auth-Request-Access-Token, X-Forwarded-Access-Token, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Authorization, mcp-protocol-version'
					}
				]
			}
		];
	}
};

export default nextConfig;
