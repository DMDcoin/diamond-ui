import React, { startTransition } from "react";
import "./navbar.css";
import dmdLogo from "../../assets/images/logo.png";
import menuIcon from "../../assets/images/menu-icon.svg";
import { useDataContext } from "../../contexts/DataContext";
import { useNavigate } from "react-router-dom";

interface NavBarProps {}

const NavBar: React.FC<NavBarProps> = () => {
  const navigate = useNavigate();
  const dataContext = useDataContext();

  return (
    <div className="nav">
      <input type="checkbox" id="nav-check" />
      <div className="nav-header" onClick={() => {startTransition(() => {navigate('')})}}>
        <div className="nav-title">
            <img src={dmdLogo} alt="logo" className="nav-logo"/>
        </div>
      </div>
      <div className="nav-btn">
        <label htmlFor="nav-check">
          <img src={menuIcon} alt="logo"/>
        </label>
      </div>
      
      <div className="nav-links">
        <a href="https://chainz.cryptoid.info/dmd/" target="_blank" rel="noreferrer">DMD Explorer</a>
        <span onClick={() => {startTransition(() => {navigate('/pools')})}}>Validators</span>
        <a href="https://bit.diamonds/" target="_blank" rel="noreferrer">DMD Ecosystem</a>
        {dataContext.dataAdapter?.wallet ? (
          <button>{dataContext.dataAdapter?.wallet.myAddr}</button>
        ) : (
          <button onClick={dataContext.connectWallet}>Signin</button>
        )}
      </div>
    </div>
  );
};

export default NavBar;
