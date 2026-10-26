const { expect, test } = require("@playwright/test");

const userPhone = "+998 90 123 45 67";
const adminPhone = "+998 99 000 00 01";

async function login(page, phone = userPhone, password = "demo1234") {
  await page.goto("/login");

  const form = page.locator("form.auth-form");
  await form.getByLabel("Telefon raqam").fill(phone);
  await form.getByLabel("Parol").fill(password);
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/profile|\/admin/);
}

test.describe("UyTop main flow", () => {
  test("login oqimi ishlaydi", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Foydalanuvchi profili" })).toBeVisible();
  });

  test("e'lon joylash va detailga o'tish ishlaydi", async ({ page }) => {
    await login(page);
    const uniqueId = Date.now();

    await page.goto("/add-listing");
    await page.getByLabel("Sarlavha").fill(`E2E test hovli ${uniqueId}`);
    await page.getByRole("textbox", { name: "Narx" }).fill("125000");
    await page.getByRole("button", { name: "Keyingi" }).click();

    await page.getByLabel("Tuman").fill("Yunusobod");
    await page.getByLabel("Manzil").fill(`E2E ko'cha ${uniqueId}`);
    await page.getByLabel("Latitude").fill("41.3111");
    await page.getByLabel("Longitude").fill("69.2797");
    await page.getByLabel("Xona").fill("4");
    await page.getByLabel("Maydon").fill("140");
    await page.getByLabel("Qavat").fill("1 / 2");
    await page
      .getByLabel("Tavsif")
      .fill("E2E test uchun yetarlicha uzun va aniq uy tavsifi.");
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: /E'lonni joylash/ }).click();

    await expect(page.getByRole("heading", { name: `E2E test hovli ${uniqueId}` })).toBeVisible();
    await page.getByRole("link", { name: "E'lonni ko'rish" }).click();
    await expect(page.getByRole("heading", { name: `E2E test hovli ${uniqueId}` })).toBeVisible();
    await expect(page.getByText("41.3111, 69.2797").first()).toBeVisible();
  });

  test("qidiruv filterlari URL queryga yoziladi", async ({ page }) => {
    await page.goto("/listings");

    await page.getByLabel("Manzil yoki kalit so'z").fill("Yunusobod");
    await page.getByLabel("Shahar").selectOption("Toshkent");
    await page.getByRole("button", { name: "Qidirish" }).click();

    await expect(page).toHaveURL(/query=Yunusobod/);
    await expect(page).toHaveURL(/city=Toshkent/);
    await expect(page.getByText(/ta e'lon/)).toBeVisible();
  });

  test("natural language qidiruv filterlarga ajratiladi", async ({ page }) => {
    await page.goto("/listings");

    await page
      .getByLabel("Manzil yoki kalit so'z")
      .fill("Toshkent 1 xona 500 dan kam ijara");
    await page.getByRole("button", { name: "Qidirish" }).click();

    await expect(page).toHaveURL(/dealType=rent/);
    await expect(page).toHaveURL(/city=Toshkent/);
    await expect(page).toHaveURL(/rooms=1/);
    await expect(page).toHaveURL(/maxPrice=500/);
    await expect(page.getByRole("status")).toContainText("Aqlli qidiruv");
  });

  test("e'lonlarni taqqoslash ishlaydi", async ({ page }) => {
    await page.goto("/listings");

    await page.getByRole("button", { name: "Taqqoslashga qo'shish" }).first().click();
    await page.getByRole("button", { name: "Taqqoslashga qo'shish" }).first().click();

    await expect(page.getByText("2 ta tanlandi")).toBeVisible();
    await page.getByRole("link", { name: "Taqqoslash" }).click();

    await expect(page).toHaveURL(/\/compare/);
    await expect(page.getByRole("heading", { name: "Uylarni taqqoslash" })).toBeVisible();
    await expect(page.getByRole("table", { name: "E'lonlarni taqqoslash jadvali" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Narx" })).toBeVisible();
  });

  test("detail sahifada ipoteka kalkulyator ishlaydi", async ({ page }) => {
    await page.goto("/listings/1");

    const mortgageCard = page.locator(".mortgage-card");
    await expect(mortgageCard.getByText("Ipoteka kalkulyator")).toBeVisible();
    await mortgageCard.getByLabel("Boshlang'ich (%)").fill("30");
    await mortgageCard.getByLabel("Muddat (yil)").fill("10");
    await mortgageCard.getByLabel("Foiz (%)").fill("12");

    await expect(mortgageCard.locator(".mortgage-payment")).toContainText("$");
    await expect(mortgageCard.getByText("Kredit summasi")).toBeVisible();
  });

  test("narx o'zgarganda detail sahifada narx tarixi ko'rinadi", async ({ page }) => {
    await login(page);
    const uniqueId = Date.now();
    const title = `E2E price trend ${uniqueId}`;

    await page.goto("/add-listing");
    await page.getByLabel("Sarlavha").fill(title);
    await page.getByRole("textbox", { name: "Narx" }).fill("150000");
    await page.getByRole("button", { name: "Keyingi" }).click();

    await page.getByLabel("Tuman").fill("Yunusobod");
    await page.getByLabel("Manzil").fill(`E2E narx ko'chasi ${uniqueId}`);
    await page.getByLabel("Xona").fill("3");
    await page.getByLabel("Maydon").fill("120");
    await page.getByLabel("Qavat").fill("2 / 4");
    await page
      .getByLabel("Tavsif")
      .fill("Price trend E2E testi uchun yetarlicha uzun uy tavsifi.");
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: /E'lonni joylash/ }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await page.getByRole("link", { name: "E'lonni ko'rish" }).click();
    await page.getByRole("link", { name: "E'lonni tahrirlash" }).click();

    await page.getByRole("textbox", { name: "Narx" }).fill("120000");
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByRole("button", { name: "O'zgarishlarni saqlash" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const priceHistoryCard = page.locator(".price-history-card");
    await expect(priceHistoryCard.getByText("Narx tarixi", { exact: true })).toBeVisible();
    await expect(priceHistoryCard.getByText("Narx 20% tushgan")).toBeVisible();
    const priceHistoryChange = priceHistoryCard.locator(".price-history-change");
    await expect(priceHistoryChange.getByText("$150,000", { exact: true })).toBeVisible();
    await expect(priceHistoryChange.getByText("$120,000", { exact: true })).toBeVisible();
  });

  test("detail sahifadan chat ochilib xabar yuboriladi", async ({ page }) => {
    await login(page);
    await page.goto("/listings/2");
    await page.getByRole("link", { name: /Xabar yozish/ }).click();

    await expect(page).toHaveURL(/\/chats\?listing=2/);
    await page
      .locator(".quick-reply-row")
      .getByRole("button", { name: "Telefon raqamingizni yubora olasizmi?" })
      .click();
    await page.getByRole("button", { name: /Yuborish/ }).click();

    await expect(page.locator(".chat-bubble.own").last()).toContainText(
      "Telefon raqamingizni yubora olasizmi?"
    );
  });

  test("admin panelda listing action logga tushadi", async ({ page }) => {
    await login(page, adminPhone, "admin1234");

    await page.goto("/admin");
    await page.getByRole("button", { name: "E'lonlar" }).click();
    await page.getByRole("button", { name: "Barchasi" }).click();
    await page.getByRole("button", { name: /Top qilish|Topdan olish/ }).first().click();
    await page.getByRole("button", { name: "Log" }).click();

    await expect(page.getByText(/Top e'lon status|Top status|Topdan/).first()).toBeVisible();
  });
});
