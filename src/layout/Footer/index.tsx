import styles from "./styles.module.css";
import React, { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import UpdateRpcModal from "../../components/Modals/UpdateRpcModal";
import { faXTwitter, faFacebookF, faSlack, faTelegram, faDiscord, faReddit, faBitcoin } from '@fortawesome/free-brands-svg-icons';

interface FooterProps {}

const Footer: React.FC<FooterProps> = ({}) => {
  const navigate = useNavigate();

  return (
    <section className="footer">
        <div className="footer-content">
            <div id="w-node-_5392aa90-05dd-9634-f7a9-c817e7363d93-55493c02" className="footer-block">
                <div className="footer-social-block">
                  <a target="_blank" href="https://twitter.com/dmdcoin" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faXTwitter} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://www.facebook.com/dmdcoin" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faFacebookF} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://t.me/DMDcoin" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faTelegram} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://app.slack.com/client/T04CRQNHG" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faSlack} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://discord.com/invite/MwqZ2CYcB4" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faDiscord} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://bitcointalk.org/index.php?topic=580725.msg6345777#msg6345777" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faBitcoin} color="#0145b2" size="lg" /></a>
                  <a target="_blank" href="https://www.reddit.com/r/dmd/" className="footer-social-link w-inline-block"><FontAwesomeIcon icon={faReddit} color="#0145b2" size="lg" /></a>
                </div>
                <a target="_blank" href="https://bit.diamonds/privacy-policy/" className={styles.titleSmall + " title-small"}>privacy Policy</a>
                <a onClick={() => {startTransition(() => {navigate('faqs')})}} className={styles.titleSmall + " title-small"}>FAQ</a>
            </div>
              <UpdateRpcModal icon={<FontAwesomeIcon icon={faCodeBranch} color="#0145b2" size="lg" />} buttonText="Update RPC" />
        </div>
    </section>
  );
};

export default Footer;
