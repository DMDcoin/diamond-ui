"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import styles from './rpc.module.css';
import copy from 'copy-to-clipboard';
import { useWeb3Context } from '@/contexts/Web3';
import { getRPC } from '@/utils/storage';
import { toast } from 'react-toastify';

type Status = 'idle' | 'validating' | 'success' | 'error' | 'saving' | 'applied';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RpcConfigurationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { web3, applyCustomRpc, resetToDefaultRpc } = useWeb3Context();
  const [inputUrl, setInputUrl] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [currentLabel, setCurrentLabel] = useState<'Default' | 'Custom'>('Default');

  const currentEndpoint = useMemo(() => {
    const provider: any = web3?.currentProvider as any;
    return provider?.host || provider?.connection?.url || provider?.rpcUrl || 'Wallet Provider';
  }, [web3]);

  useEffect(() => {
    const custom = getRPC();
    setCurrentLabel(custom ? 'Custom' : 'Default');
  }, [isOpen]);

  const onCopy = () => {
    copy(currentEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onSaveApply = async () => {
    if (!inputUrl) {
      setStatus('error');
      setMessage('Please enter an RPC URL');
      toast.warn('Please enter an RPC URL');
      return;
    }
    setStatus('saving');
    setMessage('Validating & applying...');
    const res = await applyCustomRpc(inputUrl);
    if (res.ok) {
      setStatus('applied');
      setMessage('Applied successfully');
      setCurrentLabel('Custom');
      toast.success('Custom RPC saved and applied');
    } else {
      setStatus('error');
      setMessage(res.message || 'Failed to apply RPC');
      toast.error(res.message || 'Failed to apply custom RPC');
    }
  };

  const onReset = async () => {
    setStatus('saving');
    setMessage('Resetting to default...');
    await resetToDefaultRpc();
    setStatus('idle');
    setMessage('');
    setCurrentLabel('Default');
    toast.info('Reset to default RPC');
  };

  const statusClass =
    status === 'validating' ? styles.validating :
    status === 'success' ? styles.success :
    status === 'error' ? styles.error : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.header}>
        <h3>RPC Configuration</h3>
      </div>
      <div className={styles.body}>
        <div className={styles.currentRow}>
          <div>
            <label className={styles.label}>Current endpoint</label>
            <div className={styles.currentBox}>
              <span className={styles.currentUrl} title={currentEndpoint}>{currentEndpoint}</span>
              <span className={styles.badge}>{currentLabel}</span>
              <button className={styles.copyBtn} onClick={onCopy} aria-label="Copy RPC">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.inputRow}>
          <label htmlFor="rpcUrl" className={styles.label}>New RPC URL</label>
          <input
            id="rpcUrl"
            className={`${styles.input} ${statusClass}`}
            type="text"
            placeholder="https://..."
            value={inputUrl}
            onChange={(e) => { setInputUrl(e.target.value); setStatus('idle'); setMessage(''); }}
            autoComplete="off"
          />
          {message && <div className={styles.helper}>{message}</div>}
        </div>
      </div>
      <div className={styles.footer}>
        <button className="btn-primary" onClick={onSaveApply} disabled={status === 'validating' || status === 'saving'}>
          Save & Apply
        </button>
        <button className="btn-secondary" onClick={onReset} disabled={status === 'validating' || status === 'saving'}>
          Reset to Default
        </button>
      </div>
    </Modal>
  );
};

export default RpcConfigurationModal;
