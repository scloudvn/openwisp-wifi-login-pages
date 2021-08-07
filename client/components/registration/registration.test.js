/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable camelcase */
import axios from "axios";
import {shallow, mount} from "enzyme";
import React from "react";
import {toast} from "react-toastify";
import PropTypes from "prop-types";
import {Provider} from "react-redux";
import {Router, Route} from "react-router-dom";
import {createMemoryHistory} from "history";
import PhoneInput from "react-phone-input-2";
import Modal from "../modal";
import {loadingContextValue} from "../../utils/loading-context";
import tick from "../../utils/tick";

import getConfig from "../../utils/get-config";
import loadTranslation from "../../utils/load-translation";
import Registration from "./registration";
import submitOnEnter from "../../utils/submit-on-enter";
import PasswordToggleIcon from "../../utils/password-toggle";

jest.mock("../../utils/get-config");
jest.mock("../../utils/load-translation");
jest.mock("../../utils/submit-on-enter");
jest.mock("axios");

const createTestProps = (props, configName = "default") => {
  const config = getConfig(configName);
  return {
    language: "en",
    orgSlug: configName,
    orgName: config.name,
    settings: config.settings,
    registration: config.components.registration_form,
    privacyPolicy: config.privacy_policy,
    termsAndConditions: config.terms_and_conditions,
    authenticate: jest.fn(),
    setTitle: jest.fn(),
    match: {
      path: "default/registration",
    },
    ...props,
  };
};

const mountComponent = function (passedProps) {
  const historyMock = createMemoryHistory();

  Registration.contextTypes = undefined;
  const mockedStore = {
    subscribe: () => {},
    dispatch: () => {},
    // needed to render <Contact/>
    getState: () => ({
      organization: {
        configuration: passedProps.configuration,
      },
      language: passedProps.language,
    }),
  };

  return mount(
    <Provider store={mockedStore}>
      <Router history={historyMock}>
        <Registration {...passedProps} />
      </Router>
    </Provider>,
    {
      context: {
        store: mockedStore,
        ...loadingContextValue,
      },
      childContextTypes: {
        store: PropTypes.object.isRequired,
        setLoading: PropTypes.func,
        getLoading: PropTypes.func,
      },
    },
  );
};

describe("<Registration /> rendering with placeholder translation tags", () => {
  const props = createTestProps();
  const wrapper = shallow(<Registration {...props} />, {
    context: loadingContextValue,
  });
  it("should render translation placeholder correctly", () => {
    expect(wrapper).toMatchSnapshot();
  });
});

describe("<Registration /> rendering", () => {
  let props;
  let wrapper;
  beforeEach(() => {
    props = createTestProps();
    loadTranslation("en", "default");
  });
  it("should render correctly", () => {
    props = createTestProps();
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
    });
    expect(wrapper).toMatchSnapshot();
  });
});

describe("<Registration /> interactions", () => {
  let props;
  let wrapper;
  let originalError;
  let lastConsoleOutuput;

  beforeEach(() => {
    originalError = console.error;
    lastConsoleOutuput = null;
    console.error = (data) => {
      lastConsoleOutuput = data;
    };
    props = createTestProps();
    Registration.contextTypes = {
      setLoading: PropTypes.func,
      getLoading: PropTypes.func,
    };
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
    });
  });
  afterEach(() => {
    console.error = originalError;
  });
  it("should change state values when handleChange function is invoked", () => {
    wrapper
      .find(".row.email input")
      .simulate("change", {target: {value: "test email", name: "email"}});
    expect(wrapper.state("email")).toEqual("test email");
    wrapper
      .find(".row.password input")
      .simulate("change", {target: {value: "testpassword", name: "password1"}});
    expect(wrapper.state("password1")).toEqual("testpassword");
    wrapper
      .find(".row.password-confirm input")
      .simulate("change", {target: {value: "testpassword", name: "password2"}});
    expect(wrapper.state("password2")).toEqual("testpassword");
  });

  it("should execute handleSubmit correctly when form is submitted", () => {
    axios
      .mockImplementationOnce(() =>
        Promise.reject({
          response: {
            data: {
              email: "email error",
              detail: "nonField error",
              password1: "password1 error",
            },
          },
        }),
      )
      .mockImplementationOnce(() =>
        Promise.reject({
          status: 500,
          statusText: "Internal server error",
          response: {
            data: {
              detail: "Internal server error",
            },
          },
        }),
      )
      .mockImplementationOnce(() =>
        Promise.reject({
          status: 504,
          statusText: "Gateway Timeout",
          response: {
            data: {},
          },
        }),
      )
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() =>
        Promise.reject({
          status: 400,
          statusText: "Bad Request",
          response: {
            data: {
              billing_info: {
                billingError: "registration error",
              },
            },
          },
        }),
      );
    wrapper.setState({
      password1: "wrong password",
      password2: "wrong password1",
    });
    const event = {preventDefault: () => {}};
    const spyToast = jest.spyOn(toast, "error");
    wrapper.instance().handleSubmit(event);
    expect(
      wrapper.update().find(".row.password-confirm div.error"),
    ).toHaveLength(1);
    expect(
      wrapper.update().find(".row.password-confirm input.error"),
    ).toHaveLength(1);
    wrapper.setState({
      password1: "password",
      password2: "password",
    });
    wrapper.setProps({
      registration: {
        ...props.registration,
        input_fields: {
          ...props.registration.input_fields,
        },
      },
    });
    return wrapper
      .instance()
      .handleSubmit(event)
      .then(() => {
        expect(wrapper.instance().state.errors).toEqual({
          birth_date: "",
          city: "",
          country: "",
          email: "email error",
          first_name: "",
          last_name: "",
          location: "",
          password1: "password1 error",
          password2: "",
          street: "",
          tax_number: "",
          username: "",
          zipcode: "",
        });
        expect(wrapper.find("div.error")).toHaveLength(2);
        expect(wrapper.instance().props.authenticate.mock.calls.length).toBe(0);
        expect(lastConsoleOutuput).not.toBe(null);
        expect(spyToast.mock.calls.length).toBe(1);
        lastConsoleOutuput = null;
      })
      .then(() =>
        wrapper
          .instance()
          .handleSubmit(event)
          .then(() => {
            expect(
              wrapper.instance().props.authenticate.mock.calls.length,
            ).toBe(0);
            expect(lastConsoleOutuput).not.toBe(null);
            expect(spyToast.mock.calls.length).toBe(2);
            lastConsoleOutuput = null;
          }),
      )
      .then(() =>
        wrapper
          .instance()
          .handleSubmit(event)
          .then(() => {
            expect(
              wrapper.instance().props.authenticate.mock.calls.length,
            ).toBe(0);
            expect(lastConsoleOutuput).not.toBe(null);
            expect(spyToast.mock.calls.length).toBe(3);
            lastConsoleOutuput = null;
          }),
      )
      .then(() =>
        wrapper
          .instance()
          .handleSubmit(event)
          .then(() => {
            expect(wrapper.instance().state.errors).toEqual({});
            expect(wrapper.instance().state.success).toEqual(true);
            expect(wrapper.find(".success")).toHaveLength(1);
            expect(
              wrapper.instance().props.authenticate.mock.calls.length,
            ).toBe(1);
            expect(lastConsoleOutuput).toBe(null);
            expect(spyToast.mock.calls.length).toBe(3);
            lastConsoleOutuput = null;
          }),
      )
      .then(() =>
        wrapper
          .instance()
          .handleSubmit(event)
          .then(() => {
            expect(
              wrapper.instance().props.authenticate.mock.calls.length,
            ).toBe(1);
            expect(lastConsoleOutuput).not.toBe(null);
            expect(spyToast.mock.calls.length).toBe(4);
            lastConsoleOutuput = null;
          }),
      );
  });
  it("test optional fields disabled", async () => {
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
      disableLifecycleMethods: true,
    });
    expect(wrapper.find(".first_name").length).toEqual(0);
    expect(wrapper.find(".last_name").length).toEqual(0);
    expect(wrapper.find(".birth_date").length).toEqual(0);
    expect(wrapper.find(".location").length).toEqual(0);
  });
  it("test optional fields allowed", async () => {
    props.registration.input_fields.first_name.setting = "allowed";
    props.registration.input_fields.location.setting = "allowed";
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
      disableLifecycleMethods: true,
    });
    expect(wrapper.find("[htmlFor='first_name']").text()).toEqual(
      "First name (optional)",
    );
    expect(wrapper.find("[htmlFor='location']").text()).toEqual(
      "Location (optional)",
    );
    expect(wrapper.find(".last_name").length).toEqual(0);
    expect(wrapper.find(".birth_date").length).toEqual(0);
  });
  it("test optional fields mandatory", async () => {
    props.registration.input_fields.birth_date.setting = "mandatory";
    props.registration.input_fields.first_name.setting = "mandatory";
    props.registration.input_fields.last_name.setting = "allowed";
    props.registration.input_fields.location.setting = "allowed";
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
      disableLifecycleMethods: true,
    });
    expect(wrapper.find("[htmlFor='first_name']").text()).toEqual("First name");
    expect(wrapper.find("[htmlFor='birth_date']").text()).toEqual("Birth date");
    expect(wrapper.find("[htmlFor='last_name']").text()).toEqual(
      "Last name (optional)",
    );
    expect(wrapper.find("[htmlFor='location']").text()).toEqual(
      "Location (optional)",
    );
  });
  it("should execute authenticate in mobile phone verification flow", async () => {
    axios.mockImplementationOnce(() => Promise.resolve());
    props.settings = {mobile_phone_verification: true};
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
      disableLifecycleMethods: true,
    });
    const event = {preventDefault: () => {}};
    const errorSpyToast = jest.spyOn(toast, "error");
    wrapper.setState({
      password1: "password",
      password2: "password",
    });
    wrapper.instance().handleSubmit(event);
    await tick();
    expect(wrapper.instance().state.errors).toEqual({});
    expect(wrapper.instance().state.success).toEqual(true);
    expect(wrapper.find(".success")).toHaveLength(1);
    expect(wrapper.instance().props.authenticate.mock.calls.length).toBe(1);
    expect(errorSpyToast.mock.calls.length).toBe(4);
  });
});

describe("Registration and Mobile Phone Verification interactions", () => {
  let props;
  let wrapper;
  const event = {preventDefault: jest.fn()};

  beforeEach(() => {
    props = createTestProps({}, "test-org-2");
    props.configuration = getConfig("test-org-2");
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("should show phone number field", async () => {
    wrapper = await mountComponent(props);
    expect(wrapper.exists(PhoneInput)).toBe(true);
  });

  it("should process successfully", async () => {
    wrapper = await mountComponent(props);
    expect(wrapper.exists(PhoneInput)).toBe(true);
    expect(wrapper.find("form")).toHaveLength(1);
    const component = wrapper.find(Registration).instance();
    const handleSubmit = jest.spyOn(component, "handleSubmit");

    axios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 201,
        statusText: "CREATED",
        data: null,
      }),
    );

    wrapper.find("input[name='phone_number']").simulate("change", {
      target: {value: "+393660011333", name: "phone_number"},
    });
    wrapper.find("input[name='email']").simulate("change", {
      target: {value: "tester@openwisp.io", name: "email"},
    });
    wrapper
      .find("input[name='password1']")
      .simulate("change", {target: {value: "tester123", name: "password1"}});
    wrapper
      .find("input[name='password2']")
      .simulate("change", {target: {value: "tester123", name: "password2"}});
    wrapper.find("form").simulate("submit", event);
    await tick();
    expect(wrapper.find(Registration).instance().state.errors).toEqual({});
    expect(handleSubmit).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });
  it("should load PhoneInput and its methods correctly", async () => {
    wrapper = await mountComponent(props);
    const component = wrapper.find(Registration);
    const spyFn = jest.fn();
    component.instance().handleChange = spyFn;
    const phoneField = component.find(PhoneInput);
    expect(phoneField.props().inputProps).toEqual({
      autoComplete: "tel",
      className: "form-control input ",
      id: "phone-number",
      name: "phone_number",
      required: true,
    });
    phoneField.props().onKeyDown({});
    expect(submitOnEnter).toHaveBeenCalledWith(
      {},
      expect.any(Object),
      "registration-form",
    );
    phoneField.props().onChange("+911234567890");
    expect(spyFn).toHaveBeenCalledWith({
      target: {name: "phone_number", value: "++911234567890"},
    });
  });
  it("should render modal", () => {
    props = createTestProps();
    wrapper = shallow(<Registration {...props} />);
    let pathMap = {};
    pathMap = wrapper.find(Route).reduce((mapRoute, route) => {
      const map = mapRoute;
      const routeProps = route.props();
      map[routeProps.path] = routeProps.render;
      return map;
    }, {});
    expect(pathMap["default/registration/:name"]).toEqual(expect.any(Function));
    const render = pathMap["default/registration/:name"];
    const Comp = React.createElement(Modal).type;
    expect(JSON.stringify(render({}))).toStrictEqual(JSON.stringify(<Comp />));
  });
  it("should send post data with optional fields", async () => {
    axios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 201,
        statusText: "CREATED",
        data: null,
      }),
    );
    props = createTestProps();
    Registration.contextTypes = {
      setLoading: PropTypes.func,
      getLoading: PropTypes.func,
    };
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
      disableLifecycleMethods: true,
    });
    wrapper.instance().setState({first_name: "OpenWISP"});
    wrapper.instance().handleSubmit(event);
    expect(axios).toHaveBeenCalledWith({
      data: {
        birth_date: "",
        email: "",
        first_name: "OpenWISP",
        last_name: "",
        location: "",
        password1: "",
        password2: "",
        username: "",
      },
      headers: {
        "content-type": "application/json",
      },
      method: "post",
      url: "/api/v1/default/account/",
    });
  });
  it("should toggle password icon for both password fields in PasswordToggleIcon", async () => {
    wrapper = shallow(<Registration {...props} />, {
      context: loadingContextValue,
      disableLifecycleMethods: true,
    });
    const nodes = wrapper.find(PasswordToggleIcon);
    expect(nodes.length).toEqual(2);
    expect(nodes.at(0).props()).toEqual({
      hidePassword: true,
      inputRef: {current: null},
      isVisible: false,
      parentClassName: "",
      secondInputRef: {current: null},
      toggler: expect.any(Function),
    });
    expect(wrapper.instance().state.hidePassword).toEqual(true);
    nodes.at(0).props().toggler();
    expect(wrapper.instance().state.hidePassword).toEqual(false);
    expect(nodes.at(1).props()).toEqual({
      hidePassword: true,
      inputRef: {current: null},
      isVisible: false,
      parentClassName: "",
      secondInputRef: {current: null},
      toggler: expect.any(Function),
    });
    nodes.at(1).props().toggler();
    expect(wrapper.instance().state.hidePassword).toEqual(false);
  });
});

describe("Registration without identity verification (Email registration)", () => {
  let props;
  let wrapper;
  const event = {preventDefault: jest.fn()};

  beforeEach(() => {
    props = createTestProps({}, "test-org-2");
    props.configuration = getConfig("test-org-2");
    props.configuration.settings.mobile_phone_verification = false;
    props.configuration.settings.subscriptions = false;
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("should not show phone number field", async () => {
    wrapper = await mountComponent(props);
    expect(wrapper.exists(PhoneInput)).toBe(false);
  });

  it("should process successfully", async () => {
    wrapper = await mountComponent(props);
    expect(wrapper.exists(PhoneInput)).toBe(false);
    expect(wrapper.find("form")).toHaveLength(1);
    const component = wrapper.find(Registration).instance();
    const handleChange = jest.spyOn(component, "handleChange");
    const handleSubmit = jest.spyOn(component, "handleSubmit");

    axios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 201,
        statusText: "CREATED",
        data: {
          key: "8a2b2b2dd963de23c17db30a227505f879866630",
          radius_user_token: "Lbdh3GKD7hvXUS5NUu5yoE4x5fCPPqlsXo7Ug8ld",
        },
      }),
    );

    wrapper.find("input[name='email']").simulate("change", {
      target: {value: "tester@openwisp.io", name: "email"},
    });
    wrapper
      .find("input[name='password1']")
      .simulate("change", {target: {value: "tester123", name: "password1"}});
    wrapper
      .find("input[name='password2']")
      .simulate("change", {target: {value: "tester123", name: "password2"}});
    wrapper.find("form").simulate("submit", event);
    await tick();
    expect(wrapper.find(Registration).instance().state.errors).toEqual({});
    expect(handleChange.mock.calls.length).toEqual(2);
    expect(handleSubmit).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });
  it("should set title", async () => {
    wrapper = await mountComponent(props);
    const component = wrapper.find(Registration);
    const setTitleMock = component.props().setTitle.mock;
    expect(setTitleMock.calls.pop()).toEqual(["Sign up", props.orgName]);
  });
  it("should set country when selectedCountry is executed", async () => {
    wrapper = await mountComponent(props);
    const component = wrapper.find(Registration);
    const data = {
      value: "India",
    };
    component.instance().selectedCountry(data);
    expect(component.instance().state.countrySelected).toEqual(data);
    expect(component.instance().state.country).toEqual(data.value);
  });
  it("should change selected_plan on changePlan execution", async () => {
    wrapper = await mountComponent(props);
    const component = wrapper.find(Registration);
    component.instance().setState({plans: [{verifies_identity: true}]});
    const changeEvent = {
      target: {
        value: 0,
      },
    };
    component.instance().changePlan(changeEvent);
    expect(component.instance().state.selected_plan).toEqual(0);
  });
});
