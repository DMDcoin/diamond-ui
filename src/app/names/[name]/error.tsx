'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import '@/components/DMDNames/DmdNames.css';

const RELOAD_FLAG = 'dmd-name-history-reloaded';

/**
 * A stale build serves chunks the browser can no longer fetch, which surfaces as an
 * unrecoverable client exception. One reload picks up the current build.
 */
function isStaleBuildError(error: Error): boolean {
  return error.name === 'ChunkLoadError'
    || /loading chunk|dynamically imported module|module script failed/i.test(error.message);
}

export default function NameHistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Name history page failed to render', error.digest ?? '', error);

    if (isStaleBuildError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(RELOAD_FLAG);
  }, [error]);

  return (
    <div className="dmd-names-page">
      <section className="dmd-names-content">
        <div className="container">
          <div className="dmd-history">
            <Link href="/names" className="dmd-history-back">
              <i className="fas fa-arrow-left"></i> Back to DMD Names
            </Link>

            <div className="dmd-modal-notice dmd-modal-notice-warn">
              <i className="fas fa-triangle-exclamation"></i>
              <div>
                <p><strong>This name&apos;s history could not be displayed</strong></p>
                <p>Try again — if it keeps failing, reload the page.</p>
              </div>
            </div>

            <div className="dmd-modal-actions">
              <button type="button" className="btn-primary" onClick={reset}>
                Try again
              </button>
              <Link href="/names" className="btn-secondary">
                All DMD Names
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
