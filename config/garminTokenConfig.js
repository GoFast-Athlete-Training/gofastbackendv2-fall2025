// Garmin Token Configuration
// Essential tokens for Garmin API calls

export const GARMIN_TOKEN_CONFIG = {
  // Essential tokens for Garmin UUID calls
  ESSENTIAL_TOKENS: {
    garminTokens: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYxNzc2ODE0LCJpYXQiOjE3NjE2OTA0MTQsImdhcm1pbkd1aWQiOiJhMDEyYjBmNC1lYjVmLTQwOTgtYmIwNC1mZDI4NTIwZjAzMmQiLCJqdGkiOiIzOWFmNmU2Ni1iODU1LTQ5MjUtOGZiMC04MjYwMTg4ZWU3NzAiLCJjbGllbnRfaWQiOiI4NTZiNjUwMi0wZmVkLTQ4ZmItOWU2MC02NDNjMjk5ZmIzYjcifQ.HVpb85mLFDe9bVdsXyFu75LBGYDFBWdy5VHg4uJq-sKidI3cf-bBDEr11Oeb0rO7rtCp8KfA4PM1PSWXp6bAh1qlnEoAj18cRFK8UdKuwLTm96gR4ofObzGpZrvQjqrPFb2DH-nr4bl0UvOpcFn-u2rE5pdrSV69gBS9WSGffFDSNc59p51bdBYDqslocoHRs-JhzmIJtVxbk6-bpZ5a2F1c9LRmzuelpeF4P897rcNdu8n3Dn3hjzCqCAKHOij-e7Y4C4aWUkgf7yjkk7PwxzLF8-Mffw9-kf6Ei9k_wWERv2ESyJd7l5ubHlMGEs08NhN6a0ERGGZNXidZShJoPA",
    garminRefreshToken: "eyJyZWZyZXNoVG9rZW5WYWx1ZSI6IjcwYzg0NTY5LTk1MWYtNDM1My1hNmNlLTQ5ODRjYTJiYTVlNiIsImdhcm1pbkd1aWQiOiJhMDEyYjBmNC1lYjVmLTQwOTgtYmIwNC1mZDI4NTIwZjAzMmQifQ=="
  },

  // localStorage keys - ONLY THE TWO WE NEED
  LOCALSTORAGE_KEYS: {
    GARMIN_TOKENS: 'garminTokens',           // For Garmin API calls
    GARMIN_REFRESH_TOKEN: 'garminRefreshToken' // For token refresh
  },

  // How we set them in localStorage
  SET_TOKENS: {
    access_token: "localStorage.setItem('garminTokens', data.tokens.access_token)",
    refresh_token: "localStorage.setItem('garminRefreshToken', data.tokens.refresh_token)"
  },

  // How we use them for Garmin UUID call
  USE_FOR_UUID: {
    method: "GET",
    url: "https://connectapi.garmin.com/oauth-service/oauth/user-info",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem('garminTokens'),
      "Content-Type": "application/json"
    }
  }
};

export default GARMIN_TOKEN_CONFIG;

export default GARMIN_TOKEN_CONFIG;
