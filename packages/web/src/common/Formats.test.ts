import { describe, it, expect } from "vitest";
import { formatCompactCurrency } from "./Formats";

describe("Formats", () => {
  it("should format compact EUR currency", () => {
    expect(formatCompactCurrency(123.45, 'EUR')).toEqual('€123.45');
    expect(formatCompactCurrency(6123.45, 'EUR')).toEqual('€6.12k');
    expect(formatCompactCurrency(76123.45, 'EUR')).toEqual('€76.12k');
    expect(formatCompactCurrency(876123.45, 'EUR')).toEqual('€876.12k');
    expect(formatCompactCurrency(6123000.0, 'EUR')).toEqual('€6.12M');
    expect(formatCompactCurrency(76123000.0, 'EUR')).toEqual('€76.12M');
    expect(formatCompactCurrency(876123000.0, 'EUR')).toEqual('€876.12M');
    expect(formatCompactCurrency(6123000000.0, 'EUR')).toEqual('€6.12G');
    expect(formatCompactCurrency(76123000000.0, 'EUR')).toEqual('€76.12G');
    expect(formatCompactCurrency(876123000000.0, 'EUR')).toEqual('€876.12G');
  });

  it("should format compact PLN currency", () => {
    expect(formatCompactCurrency(123.45, 'PLN')).toEqual('123,45 zł');
    expect(formatCompactCurrency(6123.45, 'PLN')).toEqual('6,12k zł');
    expect(formatCompactCurrency(76123.45, 'PLN')).toEqual('76,12k zł');
    expect(formatCompactCurrency(876123.45, 'PLN')).toEqual('876,12k zł');
    expect(formatCompactCurrency(6123000.0, 'PLN')).toEqual('6,12M zł');
    expect(formatCompactCurrency(76123000.0, 'PLN')).toEqual('76,12M zł');
    expect(formatCompactCurrency(876123000.0, 'PLN')).toEqual('876,12M zł');
    expect(formatCompactCurrency(6123000000.0, 'PLN')).toEqual('6,12G zł');
    expect(formatCompactCurrency(76123000000.0, 'PLN')).toEqual('76,12G zł');
    expect(formatCompactCurrency(876123000000.0, 'PLN')).toEqual('876,12G zł');
  });

  it("should format compact unsupported currency", () => {
    expect(formatCompactCurrency(123.45, 'USD')).toEqual('123.45 USD');
    expect(formatCompactCurrency(6123.45, 'USD')).toEqual('6.12k USD');
    expect(formatCompactCurrency(76123.45, 'USD')).toEqual('76.12k USD');
    expect(formatCompactCurrency(876123.45, 'USD')).toEqual('876.12k USD');
    expect(formatCompactCurrency(6123000.0, 'USD')).toEqual('6.12M USD');
    expect(formatCompactCurrency(76123000.0, 'USD')).toEqual('76.12M USD');
    expect(formatCompactCurrency(876123000.0, 'USD')).toEqual('876.12M USD');
    expect(formatCompactCurrency(6123000000.0, 'USD')).toEqual('6.12G USD');
    expect(formatCompactCurrency(76123000000.0, 'USD')).toEqual('76.12G USD');
    expect(formatCompactCurrency(876123000000.0, 'USD')).toEqual('876.12G USD');
  });
});
