import {
  canManageListing,
  canViewListing,
  getListingOwnerId,
} from "./listingUtils";

const owner = {
  id: "user-998901234567",
  phone: "+998 90 123 45 67",
  role: "user",
};

const otherUser = {
  id: "user-998901111111",
  phone: "+998 90 111 11 11",
  role: "user",
};

const admin = {
  id: "admin-1",
  phone: "+998 90 000 00 00",
  role: "admin",
};

const approvedListing = {
  id: 1,
  moderationStatus: "approved",
  ownerId: owner.id,
  phone: owner.phone,
};

const pendingListing = {
  ...approvedListing,
  id: 2,
  moderationStatus: "pending",
};

test("derives listing owner id from phone when ownerId is missing", () => {
  expect(getListingOwnerId({ phone: "+998 90 123 45 67" })).toBe(
    "user-998901234567"
  );
});

test("allows only the owner or admin to manage a listing", () => {
  expect(canManageListing(approvedListing, owner)).toBe(true);
  expect(canManageListing(approvedListing, admin)).toBe(true);
  expect(canManageListing(approvedListing, otherUser)).toBe(false);
  expect(canManageListing(approvedListing, null)).toBe(false);
});

test("keeps unapproved listings private unless owner or admin opens them", () => {
  expect(canViewListing(approvedListing, null)).toBe(true);
  expect(canViewListing(pendingListing, owner)).toBe(true);
  expect(canViewListing(pendingListing, admin)).toBe(true);
  expect(canViewListing(pendingListing, otherUser)).toBe(false);
  expect(canViewListing(pendingListing, null)).toBe(false);
});
