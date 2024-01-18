import React from "react";
import "./home.css";
import getStartedImg from "../../assets/images/home/getStarted.svg"

interface HomeProps {}

const Home: React.FC<HomeProps> = ({}) => {
  return (
    <div className="homeContainer">
      <div className="getStartedContainer">
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
