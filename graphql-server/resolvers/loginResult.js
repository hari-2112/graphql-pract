const LoginResult = {
  __resolveType(obj) {
    if (obj.token) {
      return "LoginSuccess";
    }

    if (obj.message) {
      return "AuthError";
    }

    return null;
  },
};

export default LoginResult;