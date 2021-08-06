import React from "react";
import propTypes from "prop-types";
import {t} from "ttag";

class PasswordToggleIcon extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isVisible: false,
    };
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    const {isVisible} = this.props;
    this.setState({
      isVisible,
    });
  }

  handleClick(inputRef, secondInputRef) {
    const {isVisible} = this.state;
    this.setState(
      {
        isVisible: !isVisible,
      },
      () => {
        inputRef.current.setAttribute(
          "type",
          inputRef.current.getAttribute("type") === "password"
            ? "text"
            : "password",
        );
        inputRef.current.focus();
        if (Object.keys(secondInputRef).length !== 0)
          secondInputRef.current.setAttribute(
            "type",
            secondInputRef.current.getAttribute("type") === "password"
              ? "text"
              : "password",
          );
      },
    );
  }

  render() {
    const {inputRef, secondInputRef, parentClassName} = this.props;
    const showPasswordIcon = () => <i className="eye" title={t`PWD_REVEAL`} />;
    const hidePasswordIcon = () => (
      <i className="eye-slash" title={t`PWD_HIDE`} />
    );
    const {isVisible} = this.state;
    const hideVal = showPasswordIcon();
    const showVal = hidePasswordIcon();
    return (
      <div
        className={parentClassName}
        onClick={() => this.handleClick(inputRef, secondInputRef)}
        role="button"
        tabIndex={0}
        onKeyDown={() => {}}
      >
        {!isVisible ? hideVal : showVal}
      </div>
    );
  }
}

export default PasswordToggleIcon;

PasswordToggleIcon.defaultProps = {
  parentClassName: "",
  secondInputRef: {},
  isVisible: false,
};

PasswordToggleIcon.propTypes = {
  inputRef: propTypes.object.isRequired,
  secondInputRef: propTypes.object,
  parentClassName: propTypes.string,
  isVisible: propTypes.bool,
};
