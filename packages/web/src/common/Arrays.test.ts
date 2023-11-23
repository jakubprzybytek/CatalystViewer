import { describe, it, expect } from "vitest";
import { formatCompactCurrency } from "./Formats";
import { removeAt, removeElement } from "./Arrays";

describe("Arrays", () => {
  it("should remove element", () => {
    expect(removeElement(['1', '2', '3'], '2')).toEqual(['1', '3']);
  });

  it("should remove element at index", () => {
    expect(removeAt(['1', '2', '3'], 1)).toEqual(['1', '3']);
  });
});
