/**
 * Skip to Content link for keyboard navigation accessibility
 * Allows users to bypass navigation and jump directly to main content
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
    >
      Saltar al contenido principal
    </a>
  )
}
