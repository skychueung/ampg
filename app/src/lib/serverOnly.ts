/**
 * Server-Only production build marker.
 *
 * This repository copy is dedicated to the 18700/18701 Server-Only
 * deployment, so local demo controls stay hidden even if no Vite env file is
 * present during a static rebuild.
 */
export const IS_SERVER_ONLY = true

export function isServerOnly(): boolean {
  return IS_SERVER_ONLY
}
