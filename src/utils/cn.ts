/**
 * Tiny className combiner.
 * Joins truthy strings — enough for our needs without a dependency.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
