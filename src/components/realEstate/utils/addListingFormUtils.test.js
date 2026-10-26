import {
  getBlankListingFormState,
  getListingFormProgress,
  getPreviewPrice,
  validateListingForm,
} from "./addListingFormUtils";

const t = (key) => key;

test("prefills blank listing form from current user", () => {
  const form = getBlankListingFormState({
    name: "Ali Valiyev",
    phone: "+998 90 123 45 67",
  });

  expect(form.agent).toBe("Ali Valiyev");
  expect(form.phone).toBe("+998 90 123 45 67");
});

test("calculates listing form progress from required fields", () => {
  const progress = getListingFormProgress({
    address: "Yunusobod",
    area: "80",
    district: "",
    floor: "2 / 5",
    price: "85000",
    rooms: "3",
    title: "Test uy",
  });

  expect(progress.completedFields).toBe(6);
  expect(progress.completionPercent).toBe(86);
});

test("formats preview price by deal type", () => {
  expect(getPreviewPrice({ dealType: "sale", price: "150000" })).toBe(
    "$150,000"
  );
  expect(getPreviewPrice({ dealType: "rent", price: "900" })).toBe("$900 / oy");
});

test("validates required listing fields", () => {
  const errors = validateListingForm(
    {
      address: "",
      agent: "",
      area: "",
      description: "short",
      district: "",
      floor: "",
      phone: "+998",
      price: "",
      rooms: "",
      title: "",
    },
    t
  );

  expect(errors).toMatchObject({
    address: "add.validation.address",
    agent: "add.validation.agent",
    area: "add.validation.area",
    description: "add.validation.description",
    district: "add.validation.district",
    floor: "add.validation.floor",
    phone: "add.validation.phone",
    price: "add.validation.price",
    rooms: "add.validation.rooms",
    title: "add.validation.title",
  });
});
