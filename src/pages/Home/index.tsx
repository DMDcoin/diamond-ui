import React from "react";
import getStartedImg from "../../assets/images/home/getStarted.svg"

import styles from "./home.module.css";

interface HomeProps {}

const Home: React.FC<HomeProps> = ({}) => {
  return (
    <div className="mainContainer">
      <div className={styles.getStartedContainer}>
        <div>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis non
            convallis tellus, eu dapibus ante.
          </p>
          <button>Get Started</button>
        </div>
        <div>
          <img src={getStartedImg}/>
        </div>
      </div>
    </div>
  );
};

export default Home;
