


/**
 * FIX: The original implementation lowercased the page name (e.g., "ChannexDashboard" → "/channexdashboard").
 * This broke routes because react-router-dom <Route path="/ChannexDashboard"> is case-sensitive.
 * Now returns the exact page name as the path, matching the route definitions in index.jsx.
 * Spaces are still converted to hyphens for URL safety.
 */
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}