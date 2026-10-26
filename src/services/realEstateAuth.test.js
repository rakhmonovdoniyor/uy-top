import { buildDemoAuthUser, isDemoAdminCredentials } from "./realEstateAuth";

const defaultUser = {
  email: "demo@uytop.uz",
  name: "Default User",
  phone: "+998 90 123 45 67",
  role: "user",
};

test("builds a regular user from auth form data", () => {
  const user = buildDemoAuthUser(
    {
      email: "ali@uytop.uz",
      name: "Ali Valiyev",
      password: "1234",
      phone: "+998 90 111 11 11",
    },
    defaultUser
  );

  expect(user).toMatchObject({
    email: "ali@uytop.uz",
    name: "Ali Valiyev",
    phone: "+998 90 111 11 11",
    role: "user",
  });
});

test("grants demo admin only for matching phone and password", () => {
  expect(
    isDemoAdminCredentials({
      password: "admin1234",
      phone: "+998 99 000 00 01",
    })
  ).toBe(true);

  expect(
    isDemoAdminCredentials({
      password: "wrong-password",
      phone: "+998 99 000 00 01",
    })
  ).toBe(false);
});

test("builds an admin user for matching demo credentials", () => {
  const user = buildDemoAuthUser(
    {
      email: "",
      name: "",
      password: "admin1234",
      phone: "+998 99 000 00 01",
    },
    defaultUser
  );

  expect(user).toMatchObject({
    email: "admin@uytop.uz",
    id: "admin-998990000001",
    name: "UyTop Admin",
    phone: "+998 99 000 00 01",
    role: "admin",
  });
});
