import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The page you requested does not exist.</p>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-brand-900 hover:underline">
        Return to home →
      </Link>
    </div>
  );
}