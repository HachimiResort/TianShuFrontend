export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (
  password: string,
): {
  isValid: boolean
  message?: string
} => {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "密码长度至少为6位",
    }
  }

  return { isValid: true }
}

export const validateUsername = (
  username: string,
): {
  isValid: boolean
  message?: string
} => {
  if (username.length < 3) {
    return {
      isValid: false,
      message: "用户名长度至少为3位",
    }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: "用户名只能包含字母、数字和下划线",
    }
  }

  return { isValid: true }
}
