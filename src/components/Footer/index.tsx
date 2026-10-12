"use client";

import { useState, useMemo } from "react";
import { useWeb3Context } from "@/contexts/Web3";
import PrivacyModeIndicator from '@/components/PrivacyModeIndicator';
import RpcConfigurationModal from "@/components/Modals/RPCConfiguration";

export default function Footer() {
  const { web3 } = useWeb3Context();
  const [open, setOpen] = useState(false);

  const currentEndpoint = useMemo(() => {
    const provider: any = web3?.currentProvider as any;
    const url: string = provider?.host || provider?.connection?.url || provider?.rpcUrl || '';
    return url;
  }, [web3]);

  const shortUrl = useMemo(() => {
    const url = currentEndpoint || '';
    if (!url) return 'Wallet Provider';
    if (url.length <= 32) return url;
    try {
      const u = new URL(url);
      const host = u.host;
      return host.length > 32 ? host.slice(0, 29) + '...' : host;
    } catch {
      return url.slice(0, 29) + '...';
    }
  }, [currentEndpoint]);

  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>Communities</h3>
            <ul>
              <li><a target="_blank" href="https://discord.com/invite/MwqZ2CYcB4">Discord</a></li>
              <li><a target="_blank" href="https://t.me/DMDcoin">Telegram</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Social Media</h3>
            <ul>
              <li><a target="_blank" href="https://www.facebook.com/dmdcoin/">Facebook</a></li>
              <li><a target="_blank" href="https://t.me/DMDcoin">Telegram</a></li>
              <li><a target="_blank" href="https://twitter.com/dmdcoin">Twitter</a></li>
              <li><a target="_blank" href="https://www.linkedin.com/company/dmd-diamond/">LinkedIn</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>More about DMD Diamond</h3>
            <ul>
              <li><a href="https://bit.diamonds/" target="_blank">Website</a></li>
              <li><a href="https://bit.diamonds/blog/" target="_blank">Blog</a></li>
              <li><a href="https://dmd-diamond.medium.com/" target="_blank">Medium</a></li>
              <li><a href="https://bitcointalk.org/index.php?topic=580725.msg64407626#msg64407626" target="_blank">Bitcointalk</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 DMD Diamond Association</p>
          <div className="footer-links">
            {/* <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a> */}
            <button className="btn-outline" onClick={() => setOpen(true)} title={currentEndpoint}>
              <i className="fas fa-cog" style={{ marginRight: 8 }}></i>
              RPC: {shortUrl}
            </button>
            <PrivacyModeIndicator />
          </div>
        </div>
      </div>
      <RpcConfigurationModal isOpen={open} onClose={() => setOpen(false)} />
    </footer>
  );
}