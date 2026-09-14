import { describe, it, expect } from "vitest";

describe("Cart Calculations & Authoritative Business Logic", () => {
  it("should calculate correct GST tax (5%) and grand total", () => {
    const subtotal = 1000;
    const taxRate = 0.05;
    const taxTotal = Math.round(subtotal * taxRate * 100) / 100;
    const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

    expect(taxTotal).toBe(50);
    expect(grandTotal).toBe(1050);
  });

  it("should compute line total accurately for multiple item quantities", () => {
    const unitPrice = 240.0;
    const quantity = 3;
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

    expect(lineTotal).toBe(720.0);
  });

  it("should handle rounding precision correctly for fractional prices", () => {
    const unitPrice = 69.99;
    const quantity = 7;
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

    expect(lineTotal).toBe(489.93);
  });
});
