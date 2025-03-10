import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import '../styles/Footer.css';

function Footer() {

    return(
        <footer>
            <a href="https://discord.gg/cXtwDJVEFF">Discord <FontAwesomeIcon icon={faDiscord} /></a>
            <p>© {new Date().getFullYear()}</p>
        </footer>
    )
}

export default Footer;