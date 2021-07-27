/* eslint-disable camelcase */
import "./index.css";

import PropTypes from "prop-types";
import React from "react";

import getText from "../../utils/get-text";
import getAssetPath from "../../utils/get-asset-path";
import shouldLinkBeShown from "../../utils/should-link-be-shown";

export default class Footer extends React.Component {
  render() {
    const {footer, language, isAuthenticated, userData, orgSlug} = this.props;
    const {links, secondary_html} = footer;
    return (
      <div className="footer-container">
        <div className="footer-row-1">
          <div className="footer-row-1-inner">
            {links.map((link) => {
              if (shouldLinkBeShown(link, isAuthenticated, userData)) {
                const css = link.css || "";
                return (
                  <a
                    href={link.url}
                    className={`footer-link ${css}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={link.url}
                  >
                    {link.icon && (
                      <img
                        src={getAssetPath(orgSlug, link.icon)}
                        alt={link.alt ? getText(link.alt, language) : ""}
                        className="footer-image"
                      />
                    )}
                    {link.text ? getText(link.text, language) : ""}
                  </a>
                );
              }
              return null;
            })}
          </div>
        </div>
        {secondary_html && (
          <div className="footer-row-2">
            <div
              className="footer-row-2-inner"
              dangerouslySetInnerHTML={{
                __html: getText(secondary_html, language),
              }}
            />
          </div>
        )}
      </div>
    );
  }
}

Footer.defaultProps = {
  isAuthenticated: false,
};
Footer.propTypes = {
  language: PropTypes.string.isRequired,
  orgSlug: PropTypes.string.isRequired,
  footer: PropTypes.shape({
    links: PropTypes.array,
    secondary_html: PropTypes.object,
  }).isRequired,
  isAuthenticated: PropTypes.bool,
  userData: PropTypes.object.isRequired,
};
