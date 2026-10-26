const DEFAULT_DEMO_ADMIN = {
  email: process.env.REACT_APP_DEMO_ADMIN_EMAIL || "admin@uytop.uz",
  name: process.env.REACT_APP_DEMO_ADMIN_NAME || "UyTop Admin",
  password: process.env.REACT_APP_DEMO_ADMIN_PASSWORD || "admin1234",
  phone: process.env.REACT_APP_DEMO_ADMIN_PHONE || "+998 99 000 00 01",
};

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export function isDemoAdminCredentials({ password = "", phone = "" } = {}) {
  return (
    normalizePhone(phone) === normalizePhone(DEFAULT_DEMO_ADMIN.phone) &&
    String(password) === DEFAULT_DEMO_ADMIN.password
  );
}

export function buildDemoAuthUser(formState, defaultUser) {
  if (isDemoAdminCredentials(formState)) {
    return {
      ...defaultUser,
      email: DEFAULT_DEMO_ADMIN.email,
      id: `admin-${normalizePhone(DEFAULT_DEMO_ADMIN.phone)}`,
      name: DEFAULT_DEMO_ADMIN.name,
      phone: DEFAULT_DEMO_ADMIN.phone,
      role: "admin",
    };
  }

  return {
    ...defaultUser,
    email: formState.email.trim() || defaultUser.email,
    name: formState.name.trim() || defaultUser.name,
    phone: formState.phone.trim(),
    role: "user",
  };
}

export const demoAdminLogin = {
  phone: DEFAULT_DEMO_ADMIN.phone,
};
