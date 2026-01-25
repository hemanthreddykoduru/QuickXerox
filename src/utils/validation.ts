export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+91\s\d{5}\s\d{5}$/;
  return phoneRegex.test(phone);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};