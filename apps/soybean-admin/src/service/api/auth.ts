import { request } from '../request';

/**
 * Login
 *
 * @param email User email
 * @param password Password
 */
export function fetchLogin(email: string, password: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    data: {
      email,
      password
    }
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/auth/profile' });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}

/**
 * Switch company
 *
 * @param companyId Company ID
 */
export function fetchSwitchCompany(companyId: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/switch-company',
    method: 'post',
    data: {
      companyId
    }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}

/**
 * Update user profile
 *
 * @param data User profile data
 */
export function fetchUpdateUserProfile(data: Partial<Api.Management.User>) {
  return request<Api.Management.User>({
    url: '/auth/profile',
    method: 'patch',
    data
  });
}

/**
 * Register
 *
 * @param data Registration data
 */
export function fetchRegister(data: any) {
  return request<any>({
    url: '/auth/register',
    method: 'post',
    data
  });
}

/**
 * Verify email
 *
 * @param email User email
 * @param code 6-digit code
 */
export function fetchVerifyEmail(email: string, code: string) {
  return request<any>({
    url: '/auth/verify-email',
    method: 'post',
    data: { email, code }
  });
}

/**
 * Resend verification code
 *
 * @param email User email
 */
export function fetchResendVerification(email: string) {
  return request<any>({
    url: '/auth/resend-verification',
    method: 'post',
    data: { email }
  });
}

/**
 * Send registration verification code
 *
 * @param email User email
 */
export function fetchSendRegistrationCode(email: string) {
  return request<any>({
    url: '/auth/send-registration-code',
    method: 'post',
    data: { email }
  });
}

/** Check if email verification is required for registration */
export function fetchVerificationRequired() {
  return request<{ required: boolean }>({
    url: '/auth/verification-required',
    method: 'get'
  });
}


/** Send password reset verification code */
export function fetchSendPasswordResetCode(email: string) {
  return request<any>({
    url: '/auth/send-password-reset-code',
    method: 'post',
    data: { email }
  });
}

/** Reset password with verification code */
export function fetchResetPassword(data: any) {
  return request<any>({
    url: '/auth/reset-password',
    method: 'post',
    data
  });
}

/** Verify password reset code */
export function fetchVerifyPasswordResetCode(email: string, code: string) {
  return request<any>({
    url: '/auth/verify-password-reset-code',
    method: 'post',
    data: { email, code }
  });
}
