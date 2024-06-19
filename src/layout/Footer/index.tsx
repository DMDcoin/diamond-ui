import React from "react";
import { faXTwitter, faFacebookF, faSlack, faTelegram, faDiscord, faReddit, faBitcoin } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import linked_small  from "../../assets/images/linkedin_small.svg";
import twitter_small  from "../../assets/images/twitter_small.svg";
import facebook_small  from "../../assets/images/facebook_small.svg";

interface FooterProps {}

const Footer: React.FC<FooterProps> = ({}) => {
  return (
    <section className="footer">
        <div className="footer-content">
            <div id="w-node-_5392aa90-05dd-9634-f7a9-c817e7363d93-55493c02" className="footer-block">
                <div className="footer-social-block">
                  <a target="_blank" href="https://twitter.com/dmdcoin" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faXTwitter} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://www.facebook.com/dmdcoin" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faFacebookF} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://t.me/DMDcoin" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faTelegram} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://app.slack.com/client/T04CRQNHG" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faSlack} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://discord.com/invite/TStv6gm" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faDiscord} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://bitcointalk.org/index.php?topic=580725.msg6345777#msg6345777" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faBitcoin} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://www.reddit.com/r/dmd/" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faReddit} color="#0145b2" size="lg" /></a>
                </div>
                <div className="title-small">privacy Policy</div>
            </div>
            <div className="footer-copyright-center">Copyright © 2024 DMD Diamond</div>
        </div>
    </section>
  );
};

export default Footer;
