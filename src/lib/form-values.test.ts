import { describe, expect, it } from "vitest";
import { getNumber } from "@/lib/form-values";

describe("form numeric values", () => {
  it("keeps missing and blank optional numbers undefined", () => {
    const formData = new FormData();
    expect(getNumber(formData, "missing")).toBeUndefined();
    formData.set("blank", "   ");
    expect(getNumber(formData, "blank")).toBeUndefined();
  });

  it("preserves an explicit zero and rejects non-numeric text", () => {
    const formData = new FormData();
    formData.set("zero", "0");
    formData.set("invalid", "abc");
    expect(getNumber(formData, "zero")).toBe(0);
    expect(getNumber(formData, "invalid")).toBeUndefined();
  });
});
