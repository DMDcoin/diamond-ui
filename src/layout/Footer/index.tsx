import React from "react";
import linked_small  from "../../assets/images/linkedin_small.svg";
import twitter_small  from "../../assets/images/twitter_small.svg";
import facebook_small  from "../../assets/images/facebook_small.svg";

interface FooterProps {}

const Footer: React.FC<FooterProps> = ({}) => {
  return (
    <section className="footer">
        <div className="footer-content">
            <div id="w-node-_5392aa90-05dd-9634-f7a9-c817e7363d93-55493c02" className="footer-block">
                <div className="footer-social-block"><a href="#" className="footer-social-link w-inline-block">
                  <img src={twitter_small} loading="lazy" alt="" className="image" /></a><a href="#" className="footer-social-link w-inline-block">
                  <img src={linked_small} loading="lazy" alt="" /></a><a href="#" className="footer-social-link w-inline-block">
                  <img src={facebook_small} loading="lazy" alt="" /></a></div>
                <div className="title-small">privacy Policy</div>
            </div>
            <div className="footer-copyright-center">Copyright © 2024 DMD Diamond</div>
        </div>
    </section>
  );
};

export default Footer;
