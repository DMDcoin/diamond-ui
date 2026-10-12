'use client';

import { useEffect, useMemo, useState } from 'react';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import { config } from '@/lib/config';
import { useRuntimeConfig } from '@/contexts/RuntimeConfig';
import { formatDmdName } from '@/utils/dmdNaming';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
};

const MAX_DESCRIPTION = 800;
const MAX_EVIDENCE = 400;
const MAX_MAILTO_LENGTH = 1900;

export default function ReportNameModal({ isOpen, onClose, name }: Props) {
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [touched, setTouched] = useState(false);
  const [handedOff, setHandedOff] = useState(false);

  const { config: runtimeConfig } = useRuntimeConfig();

  const fullName = formatDmdName(name);
  const recipient = runtimeConfig?.reportEmail || config.reportEmail;

  useEffect(() => {
    if (!isOpen) return;
    setDescription('');
    setEvidence('');
    setTouched(false);
    setHandedOff(false);
  }, [isOpen]);

  const descriptionError =
    touched && description.trim().length < 10
      ? 'Please describe the problem in at least 10 characters.'
      : null;

  const { subject, body } = useMemo(() => {
    const siteUrl = (runtimeConfig?.siteUrl || config.siteUrl || '').replace(/\/$/, '');
    const lines = [
      `DMD name: ${fullName}`,
      ...(siteUrl ? [`Name page: ${siteUrl}/names/${name}`] : []),
      '',
      'Description:',
      description.trim() || '—',
    ];

    if (evidence.trim()) {
      lines.push('', 'Evidence:', evidence.trim());
    }

    return { subject: `DMD Name Report: ${fullName}`, body: lines.join('\r\n') };
  }, [fullName, name, description, evidence, runtimeConfig?.siteUrl]);

  const mailtoHref = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const tooLongForMailto = mailtoHref.length > MAX_MAILTO_LENGTH;

  const handleClose = () => onClose();

  const handleCopy = () => {
    copy(`To: ${recipient}\r\nSubject: ${subject}\r\n\r\n${body}`);
    toast.success('Report copied to clipboard');
  };

  const isValid = description.trim().length >= 10;

  // A genuine anchor activation is far more likely to reach the OS mail handler
  // than a scripted location change, so the button is a link and this only guards it.
  const handleSubmit = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setTouched(true);
    if (!isValid || tooLongForMailto) {
      event.preventDefault();
      if (isValid) setHandedOff(true);
      return;
    }
    setHandedOff(true);
  };

  if (!recipient) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="dmd-modal">
          <h2>Reporting unavailable</h2>
          <div className="dmd-modal-notice dmd-modal-notice-warn">
            <i className="fas fa-triangle-exclamation"></i>
            <p>
              No moderation address is configured for this site, so reports cannot be sent
              from here yet. Please reach out to the DMD team through the community channels.
            </p>
          </div>
          <div className="dmd-modal-actions">
            <button type="button" className="btn-primary" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (handedOff) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="dmd-modal">
          <h2>Finish sending your report</h2>

          {tooLongForMailto ? (
            <div className="dmd-modal-notice dmd-modal-notice-warn">
              <i className="fas fa-triangle-exclamation"></i>
              <p>
                This report is too long to hand to your email app automatically. Copy it below
                and paste it into a new email to <strong>{recipient}</strong>.
              </p>
            </div>
          ) : (
            <div className="dmd-modal-notice dmd-modal-notice-info">
              <i className="fas fa-envelope"></i>
              <p>
                Your email app should have opened with the report ready to send.
                <strong> The report is only submitted once you send that email.</strong>
              </p>
            </div>
          )}

          <p className="dmd-form-label">If nothing opened, copy the report and send it manually</p>
          <pre className="dmd-report-preview">{`To: ${recipient}\nSubject: ${subject}\n\n${body}`}</pre>

          <div className="dmd-modal-actions">
            <button type="button" className="btn-secondary" onClick={handleCopy}>
              <i className="fas fa-copy dmd-report-copy-icon"></i>Copy report
            </button>
            {!tooLongForMailto && (
              <a className="btn-secondary" href={mailtoHref}>
                Open email app again
              </a>
            )}
            <button type="button" className="btn-primary" onClick={handleClose}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="dmd-modal">
        <h2>Report &quot;{fullName}&quot;</h2>

        <div className="dmd-modal-notice dmd-modal-notice-info">
          <i className="fas fa-info-circle"></i>
          <p>
            Submitting opens your email app with the report addressed to the moderation team.
            Removing a name requires a DAO proposal, so this does not hide the name immediately.
          </p>
        </div>

        <label className="dmd-form-label" htmlFor="dmd-report-name">DMD name</label>
        <input id="dmd-report-name" type="text" className="dmd-form-input" value={fullName} readOnly />

        <label className="dmd-form-label" htmlFor="dmd-report-description">
          Description <span className="dmd-form-required">required</span>
        </label>
        <textarea
          id="dmd-report-description"
          className="dmd-form-input dmd-form-textarea"
          placeholder="What is wrong with this name?"
          rows={4}
          maxLength={MAX_DESCRIPTION}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {descriptionError ? (
          <p className="dmd-form-error">{descriptionError}</p>
        ) : (
          <p className="dmd-form-hint">{description.length}/{MAX_DESCRIPTION}</p>
        )}

        <label className="dmd-form-label" htmlFor="dmd-report-evidence">
          Evidence <span className="dmd-form-optional">optional</span>
        </label>
        <textarea
          id="dmd-report-evidence"
          className="dmd-form-input dmd-form-textarea"
          placeholder="Links, transaction hashes or anything else that supports the report"
          rows={3}
          maxLength={MAX_EVIDENCE}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
        />

        <div className="dmd-modal-actions">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <a
            className="btn-primary"
            href={tooLongForMailto ? undefined : mailtoHref}
            onClick={handleSubmit}
          >
            Submit report
          </a>
        </div>
      </div>
    </Modal>
  );
}
