const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const isEmail = (value) => emailPattern.test(value.trim());
export const isIndianMobile = (value) => mobilePattern.test(value.replace(/\s/g, ''));
export const isStrongPassword = (value) => passwordPattern.test(value);

export function validateRegistration(values, t) {
  const errors = {};
  if (!values.fullName.trim()) errors.fullName = t('required');
  if (!values.email.trim()) errors.email = t('required');
  else if (!isEmail(values.email)) errors.email = t('invalidEmail');
  if (!values.mobile.trim()) errors.mobile = t('required');
  else if (!isIndianMobile(values.mobile)) errors.mobile = t('invalidMobile');
  if (!values.password) errors.password = t('required');
  else if (!isStrongPassword(values.password)) errors.password = t('weakPassword');
  if (!values.confirmPassword) errors.confirmPassword = t('required');
  else if (values.confirmPassword !== values.password) errors.confirmPassword = t('passwordMismatch');
  if (!values.acceptTerms) errors.acceptTerms = t('acceptTerms');
  return errors;
}

export function validateLogin(values, t) {
  const errors = {};
  if (!values.identifier.trim()) errors.identifier = t('required');
  else if (!isEmail(values.identifier) && !isIndianMobile(values.identifier)) errors.identifier = t('invalidIdentifier');
  if (!values.password) errors.password = t('required');
  return errors;
}
