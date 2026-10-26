import { realEstateRepository } from "./realEstateRepository";

const storedAdmin = {
  email: "admin@uytop.uz",
  id: "admin-998990000001",
  name: "Stored Admin",
  phone: "+998 99 000 00 01",
  role: "admin",
};

test("uses the incoming auth role when an existing user logs in", () => {
  const nextState = realEstateRepository.upsertUser([storedAdmin], {
    email: storedAdmin.email,
    name: "Regular Login",
    phone: storedAdmin.phone,
    role: "user",
  });

  expect(nextState.user.role).toBe("user");
});

test("keeps explicit admin role for demo admin credentials", () => {
  const nextState = realEstateRepository.upsertUser([], {
    email: "admin@uytop.uz",
    id: "admin-998990000001",
    name: "UyTop Admin",
    phone: "+998 99 000 00 01",
    role: "admin",
  });

  expect(nextState.user.role).toBe("admin");
  expect(nextState.users).toHaveLength(1);
});
