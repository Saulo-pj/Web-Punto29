import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SITE_CONTENT } from "../src/features/site-content/defaultSiteContent.js";
import { isValidSiteContent } from "../server/floorLayoutPlugin.js";

test("default site content is valid and includes the required carousel slides", () => {
  assert.equal(isValidSiteContent(DEFAULT_SITE_CONTENT), true);
  assert.equal(DEFAULT_SITE_CONTENT.happyHour.slides.length >= 3, true);
});

test("site content rejects unsafe image sources and duplicate slide identifiers", () => {
  const unsafeImage = structuredClone(DEFAULT_SITE_CONTENT);
  unsafeImage.chefs.people[0].image = "javascript:alert(1)";
  assert.equal(isValidSiteContent(unsafeImage), false);

  const missingImage = structuredClone(DEFAULT_SITE_CONTENT);
  missingImage.recommendations.dishes[0].image = "";
  assert.equal(isValidSiteContent(missingImage), false);

  const duplicateSlideId = structuredClone(DEFAULT_SITE_CONTENT);
  duplicateSlideId.happyHour.slides[1].id = duplicateSlideId.happyHour.slides[0].id;
  assert.equal(isValidSiteContent(duplicateSlideId), false);

  const malformedSlide = structuredClone(DEFAULT_SITE_CONTENT);
  malformedSlide.happyHour.slides[0] = null;
  assert.equal(isValidSiteContent(malformedSlide), false);
});
