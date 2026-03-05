import { redirect } from 'next/navigation'

/**
 * Root route — redirect to the calculator page.
 * With basePath "/vessel", this handles requests to /vessel/.
 */
export default function RootPage() {
  redirect('/vessel/calculator')
}
