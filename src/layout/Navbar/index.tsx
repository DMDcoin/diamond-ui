import React, { startTransition } from "react";
import "./styles.css";
import { useNavigate } from "react-router-dom";
import dmdLogo from "../../assets/images/logo.png";
import menuIcon from "../../assets/images/menu-icon.svg";
import { useWeb3Context } from "../../contexts/Web3Context";
import dmdLogoFull from "../../assets/images/logo_dmd_full.svg";

interface NavBarProps {}

const NavBar: React.FC<NavBarProps> = () => {
  const navigate = useNavigate();
  const web3Context = useWeb3Context();
  const [openSideBar, setOpenSideBar] = React.useState<boolean>(false);

  return (
    <div data-animation="default" data-collapse="medium" data-duration="400" data-easing="ease" data-easing2="ease" role="banner" className="navbar w-nav">
        <div className="nav-container w-container">
          <a href="#" className="brand w-nav-brand">
          <img onClick={() => {startTransition(() => {navigate('')})}} src={dmdLogoFull} loading="lazy" width="174" alt="" className="image-2" /></a>
            <nav role="navigation" className="nav-menu nav-responsive-active w-nav-menu">
              
              <a href="https://chainz.cryptoid.info/dmd/" target="_blank" className="nav-link w-nav-link">DMD Explorer</a>
              <a onClick={() => {startTransition(() => {navigate('staking')})}} className="nav-link w-nav-link">Validator Candidates</a>

              <div data-hover="false" data-delay="0" className="dropdown-2 w-dropdown">
                  <div className="dropdown-toggle-2 w-dropdown-toggle">
                    <div className="icon w-icon-dropdown-toggle"></div>
                    <div className="text-block-12">DMD Ecosystem</div>
                  </div>
                  <nav className="dropdown-list-2 w-dropdown-list">
                    <a href="https://bit.diamonds/" target="_blank" className="nav-dropdown-link nav-link w-dropdown-link">Bit Diamonds</a>
                    <a href="https://uniq.directory/" target="_blank" className="nav-link w-dropdown-link">NFT Marketplace</a>
                    <a href="https://uniq.diamonds/" target="_blank" className="nav-link w-dropdown-link">uNiq Diamonds</a>
                    <a href="https://gladiators.diamonds/" target="_blank" className="nav-link w-dropdown-link">uNiq Gladiators</a>
                  </nav>
              </div>
                
              {web3Context.userWallet && web3Context.userWallet.myAddr ? (
                <a onClick={() => {startTransition(() => {navigate('dao')})}} className="nav-link w-nav-link">DAO</a>
              ) : (
                <button onClick={web3Context.connectWallet} className="button w-button w-nav-link-button">Sign in</button>
              )}

            </nav>
            <div className="menu-button w-nav-button">
                <div className="w-icon-nav-menu"></div>
            </div>
        </div>
    </div>
  );
};

export default NavBar;
