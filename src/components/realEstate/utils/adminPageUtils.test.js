import {
  getAdminPageData,
  getDuplicateGroups,
  getUserIdFromPhone,
  hasLikelyLowQualityImage,
} from "./adminPageUtils";

test("builds user id from phone digits", () => {
  expect(getUserIdFromPhone("+998 90 123 45 67")).toBe("user-998901234567");
});

test("flags missing or small listing images as low quality", () => {
  expect(hasLikelyLowQualityImage({})).toBe(true);
  expect(
    hasLikelyLowQualityImage({
      image: "image.jpg",
      imageMetadata: [{ height: 600, size: 90000, width: 900 }],
    })
  ).toBe(true);
  expect(
    hasLikelyLowQualityImage({
      image: "image.jpg",
      imageMetadata: [{ height: 900, size: 200000, width: 1400 }],
    })
  ).toBe(false);
});

test("groups duplicate listings by owner and address details", () => {
  const groups = getDuplicateGroups([
    {
      address: "1-uy",
      city: "Toshkent",
      district: "Yunusobod",
      id: 1,
      ownerId: "user-1",
      title: "Uy",
    },
    {
      address: "1-uy",
      city: "Toshkent",
      district: "Yunusobod",
      id: 2,
      ownerId: "user-1",
      title: "Uy",
    },
    {
      address: "2-uy",
      city: "Toshkent",
      district: "Yunusobod",
      id: 3,
      ownerId: "user-1",
      title: "Uy",
    },
  ]);

  expect(groups).toHaveLength(1);
  expect(groups[0].map((listing) => listing.id)).toEqual([1, 2]);
});

test("derives admin page counts and selected user details", () => {
  const data = getAdminPageData({
    actionFilter: "all",
    adminActions: [{ id: 1, type: "listing" }],
    allListings: [
      {
        id: 1,
        moderationStatus: "pending",
        ownerId: "user-998901234567",
        phone: "+998 90 123 45 67",
        tags: ["Top e'lon"],
      },
    ],
    listingReports: [{ id: 1, listingId: 1, status: "open" }],
    messages: [
      {
        id: 1,
        recipientId: "user-998901234567",
        senderId: "admin",
      },
    ],
    selectedUserKey: "",
    statusFilter: "pending",
    userSearch: "",
    users: [
      {
        name: "Ali",
        phone: "+998 90 123 45 67",
        role: "user",
      },
    ],
  });

  expect(data.pendingCount).toBe(1);
  expect(data.openReportCount).toBe(1);
  expect(data.topCount).toBe(1);
  expect(data.selectedUser.name).toBe("Ali");
  expect(data.selectedUserListings).toHaveLength(1);
  expect(data.selectedUserMessages).toHaveLength(1);
});
