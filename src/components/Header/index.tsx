'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useWeb3Context } from '@/contexts/Web3';
import { truncateAddress } from '@/utils/common';
import { formatDmdFromWei } from '@/utils/format';
import { useState, useEffect, useRef } from 'react';
import { useWalletConnect } from '@/contexts/WalletConnect';
import { useWalletTotals } from '@/hooks/useWalletTotals';
import { useProfileOnConnect } from '@/hooks/useProfileOnConnect';
import InfoTooltip from '@/components/InfoTooltip';
import { config } from '@/lib/config';

// Width at which the nav collapses into the hamburger.
const NAV_BREAKPOINT = 1024;

const ECOSYSTEM_ROUTES = ['/names'];
const KNOWLEDGEBASE_ROUTES = ['/faqs'];
const ZERO = BigInt(0);

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { open: openWalletModal, address, isConnected, disconnect } = useWalletConnect();
  const { userWallet, retryWalletConnection } = useWeb3Context();
  const totals = useWalletTotals();

  useProfileOnConnect();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState('/logos/dmd-logo.png');
  const navLinksRef = useRef<HTMLUListElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuBtnRef = useRef<HTMLDivElement>(null);

  // Close the collapsed menu and restore page scrolling
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    document.body.style.overflow = '';
  };

  // Handle wallet connect button click
  const handleWalletConnect = () => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
    if (isConnected && !userWallet.myAddr) {
      retryWalletConnection();
      return;
    }
    if (!isConnected) {
      openWalletModal();
    }
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    // Only navigate to profile if wallet is connected
    if (isConnected && userWallet.myAddr) {
      router.push('/profile');
      closeMobileMenu();
    }
  };

  // Handle wallet disconnect
  const handleDisconnect = () => {
    disconnect();
    closeMobileMenu();
    router.push('/');
  };

  // Handle wallet dropdown toggle
  const handleWalletDropdownToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(prev => prev === 'wallet' ? null : 'wallet');
  };

  const handleWalletKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') handleWalletDropdownToggle(e);
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => {
      const newState = !prev;
      
      // When closing the menu, also close any open dropdowns
      if (!newState) {
        setActiveDropdown(null);
        document.body.style.overflow = '';
      } else {
        document.body.style.overflow = 'hidden';
      }
      
      return newState;
    });
  };

  // Handle dropdown toggle
  const handleDropdownToggle = (dropdownName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle click behavior on mobile
    if (window.innerWidth <= NAV_BREAKPOINT) {
      setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
    }
  };

  // Close mobile menu when clicking regular links
  const handleRegularLinkClick = () => {
    if (window.innerWidth <= NAV_BREAKPOINT) {
      setIsMobileMenuOpen(false);
      setActiveDropdown(null);
      document.body.style.overflow = '';
    }
  };

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Setup event listeners
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Close dropdown when clicking outside on mobile
      if (window.innerWidth <= NAV_BREAKPOINT) {
        if (!target.closest('.dropdown') && !target.closest('.mobile-menu-btn') && !target.closest('.user-wallet-info')) {
          setActiveDropdown(null);
        }
      } else {
        // Close wallet dropdown when clicking outside on desktop
        if (!target.closest('.user-wallet-info')) {
          setActiveDropdown(prev => (prev === 'wallet' ? null : prev));
        }
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
        document.body.style.overflow = '';
      } else {
        setActiveDropdown(null);
      }
    };

    const handleResize = () => {
      // Reset overflow if menu is closed on resize to desktop
      if (window.innerWidth > NAV_BREAKPOINT) {
        document.body.style.overflow = '';
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleEscKey);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  // Close the wallet dropdown and collapsed menu whenever the route changes
  useEffect(() => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, [pathname]);

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Theme detection and logo switching
  useEffect(() => {
    const updateLogo = () => {
      const isLightTheme = document.body.classList.contains('light-theme');
      setLogoSrc(isLightTheme ? '/logos/dmd-logo-dark.png' : '/logos/dmd-logo.png');
    };

    updateLogo();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateLogo();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const isActiveRoute = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const exactDmd = (wei: bigint) => formatDmdFromWei(wei);
  const plainDmd = (wei: bigint) => formatDmdFromWei(wei, { unit: false });
  const shielded = (value: string) => (totals.isHidden ? '—' : value);

  const isWalletOpen = activeDropdown === 'wallet';

  const renderWalletTotal = () => {
    if (totals.isHidden) {
      return <span className="hdr-wallet-total" aria-label="Balance hidden in privacy mode">—</span>;
    }
    if (totals.isLoading) {
      return <span className="hdr-wallet-total-skeleton" role="status" aria-label="Loading total balance" />;
    }
    return (
      <span className="hdr-wallet-total" aria-label={`Total balance ${exactDmd(totals.totalWei)}`}>
        {formatDmdFromWei(totals.totalWei)}
      </span>
    );
  };

  const renderBalanceBreakdown = (scope: 'bar' | 'drawer') => (
    <div className="dropdown-section hdr-balance">
      <h4>
        DMD balance
        <InfoTooltip
          id={`hdr-balance-tip-${scope}`}
          interactive
          label="What the combined balance includes"
          content={
            <div>
              <p>
                Everything this wallet controls: coins you can spend now, plus everything you have
                staked.
              </p>
              {totals.pendingWithdrawWei > ZERO && (
                <p>
                  Coins in an ordered unstake are listed separately because they have already left
                  your stake and only reach your wallet once you claim them.
                </p>
              )}
            </div>
          }
        >
          <i className="fas fa-info-circle" aria-hidden="true"></i>
        </InfoTooltip>
      </h4>

      <dl className="hdr-balance-list">
        <div className="hdr-balance-row">
          <dt>Wallet</dt>
          <dd>{shielded(plainDmd(totals.liquidWei))}</dd>
        </div>
        {totals.ownStakeWei > ZERO && (
          <div className="hdr-balance-row">
            <dt>Own stake</dt>
            <dd>{shielded(plainDmd(totals.ownStakeWei))}</dd>
          </div>
        )}
        {totals.delegatedWei > ZERO && (
          <div className="hdr-balance-row">
            <dt>Delegated out</dt>
            <dd>{shielded(plainDmd(totals.delegatedWei))}</dd>
          </div>
        )}
        <div className="hdr-balance-row hdr-balance-row--total">
          <dt>Total</dt>
          <dd>
            {shielded(plainDmd(totals.totalWei))} <span className="hdr-balance-unit">DMD</span>
          </dd>
        </div>
        {totals.pendingWithdrawWei > ZERO && (
          <div className="hdr-balance-row hdr-balance-row--pending">
            <dt>Pending unstake</dt>
            <dd>{shielded(plainDmd(totals.pendingWithdrawWei))}</dd>
          </div>
        )}
      </dl>
    </div>
  );

  const renderWallet = (scope: 'bar' | 'drawer') => {
    if (isConnected && userWallet.myAddr) {
      return (
        <div
          className={`user-wallet-info dropdown ${isWalletOpen ? 'active' : ''}`}
          onClick={handleWalletDropdownToggle}
          onKeyDown={handleWalletKeyDown}
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={isWalletOpen}
          style={{ cursor: 'pointer' }}
        >
          <div className="dropdown-toggle">
            <div className="wallet-icon">
              <div className="wallet-icon-inner"></div>
            </div>
            <div className="hdr-wallet-lines">
              <span className="wallet-address">{truncateAddress(userWallet.myAddr)}</span>
              {renderWalletTotal()}
            </div>
            <i className="fas fa-chevron-down wallet-address-dropdown" aria-hidden="true"></i>
          </div>
          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-content">
              {renderBalanceBreakdown(scope)}
              <div className="dropdown-section">
                <ul>
                  <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileClick(); }}>
                      <i className="fas fa-user"></i> Profile
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isConnected && userWallet.myAddr) {
                          router.push(`/dmd-names/${userWallet.myAddr}`);
                          closeMobileMenu();
                        }
                      }}
                    >
                      <i className="fas fa-tag"></i> My DMD Names
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hdr-menu-danger"
                      onClick={(e) => { e.preventDefault(); handleDisconnect(); }}
                    >
                      <i className="fas fa-sign-out-alt"></i> Disconnect
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="cta-button" onClick={handleWalletConnect} style={{ cursor: 'pointer' }}>
        <i className="fas fa-wallet"></i> Connect Wallet
      </div>
    );
  };

  return (
    <header ref={headerRef}>
      <div className="container">
        <div className="logo">
          <Link href="/">
            <Image
              className="logo-img"
              src={logoSrc}
              alt="DMD Diamond Logo"
              width={116}
              height={56}
              priority
            />
          </Link>
        </div>
        
        <nav>
          <ul className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`} ref={navLinksRef}>
            <li>
              <Link
                href="/validators"
                aria-current={isActiveRoute('/validators') ? 'page' : undefined}
                onClick={handleRegularLinkClick}
              >
                Validators
              </Link>
            </li>

            <li className={`dropdown ${activeDropdown === 'ecosystem' ? 'active' : ''} ${ECOSYSTEM_ROUTES.some(isActiveRoute) ? 'is-active' : ''}`}>
              <a 
                href="#" 
                className="dropdown-toggle"
                onClick={(e) => handleDropdownToggle('ecosystem', e)}
              >
                DMD Ecosystem <i className="fas fa-chevron-down"></i>
              </a>
              <div className="dropdown-menu">
                <div className="dropdown-content">
                  <div className="dropdown-section">
                    <ul>
                      <li>
                        <a href="https://bit.diamonds" target="_blank" rel="noopener noreferrer">
                          Bit Diamonds<i className="fas fa-external-link-alt"></i>
                        </a>
                      </li>
                      <li>
                        <a href={config.explorerUrl} target="_blank" rel="noopener noreferrer">
                          DMD Explorer<i className="fas fa-external-link-alt"></i>
                        </a>
                      </li>
                      <li>
                        <Link href="/names" onClick={handleRegularLinkClick}>
                          <i className="fas fa-search"></i> DMD Names
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </li>
            
            {/* <li className={`dropdown ${activeDropdown === 'thirdparty' ? 'active' : ''}`}>
              <a 
                href="#" 
                className="dropdown-toggle"
                onClick={(e) => handleDropdownToggle('thirdparty', e)}
              >
                3rd Party Projects <i className="fas fa-chevron-down"></i>
              </a>
              <div className="dropdown-menu">
                <div className="dropdown-content">
                  <div className="dropdown-section">
                    <ul>
                      <li>
                        <a href="https://uniq.directory/" target="_blank" rel="noopener noreferrer">
                          NFT Marketplace <i className="fas fa-external-link-alt"></i>
                        </a>
                      </li>
                      <li>
                        <a href="https://uniq.diamonds/" target="_blank" rel="noopener noreferrer">
                          uNiq Diamonds <i className="fas fa-external-link-alt"></i>
                        </a>
                      </li>
                      <li>
                        <a href="https://gladiators.diamonds/" target="_blank" rel="noopener noreferrer">
                          uNiq Gladiators <i className="fas fa-external-link-alt"></i>
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </li> */}

            <li>
              <Link
                href="/dao"
                aria-current={isActiveRoute('/dao') ? 'page' : undefined}
                onClick={handleRegularLinkClick}
              >
                DAO
              </Link>
            </li>

            <li>
              <Link
                href="/rich-list"
                aria-current={isActiveRoute('/rich-list') ? 'page' : undefined}
                onClick={handleRegularLinkClick}
              >
                Rich List
              </Link>
            </li>

            <li className={`dropdown ${activeDropdown === 'knowledgebase' ? 'active' : ''} ${KNOWLEDGEBASE_ROUTES.some(isActiveRoute) ? 'is-active' : ''}`}>
              <a
                href="#"
                className="dropdown-toggle"
                onClick={(e) => handleDropdownToggle('knowledgebase', e)}
              >
                Knowledge Base <i className="fas fa-chevron-down"></i>
              </a>
              <div className="dropdown-menu">
                <div className="dropdown-content">
                  <div className="dropdown-section">
                    <ul>
                      <li>
                        <a href="https://overview.bit.diamonds" target="_blank" rel="noopener noreferrer">
                          <i className="fas fa-info-circle"></i> About DMD<i className="fas fa-external-link-alt"></i>
                        </a>
                      </li>
                      <li>
                        <a href="https://github.com/DMDcoin/whitepaper/wiki/A.-Home" target="_blank" rel="noopener noreferrer">
                          <i className="fas fa-file-alt"></i> GitHub Whitepaper
                        </a>
                      </li>
                      <li>
                        <Link href="/faqs" onClick={handleRegularLinkClick}>
                          <i className="fas fa-question-circle"></i> FAQ
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </li>

            <li className="mobile-wallet-container">
              {renderWallet('drawer')}
            </li>
          </ul>
        </nav>
        
        <div className="header-right">
          <div className="theme-toggle-wrapper">
            <label className="theme-toggle">
              <input type="checkbox" id="theme-toggle" />
              <span className="theme-toggle-slider">
                <i className="fas fa-sun theme-toggle-icon sun"></i>
                <i className="fas fa-moon theme-toggle-icon moon"></i>
              </span>
            </label>
          </div>
          
          {renderWallet('bar')}
        </div>

        <div
          className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
          ref={mobileMenuBtnRef}
          onClick={toggleMobileMenu}
        >
          <i className="fas fa-bars"></i>
          <i className="fas fa-times"></i>
        </div>
      </div>
    </header>
  );
}