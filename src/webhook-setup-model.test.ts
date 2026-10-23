import { describe, expect, it } from "vitest";
import { webhookStep } from "./webhook-setup-model";

describe("webhookStep", () => {
  it("starts at the address", () => {
    expect(
      webhookStep({
        hasEndpoint: false,
        active: false,
        configured: false,
        testDelivered: false,
      }),
    ).toBe(0);
  });
  it("asks for the signature after registering", () => {
    expect(
      webhookStep({
        hasEndpoint: true,
        active: false,
        configured: false,
        testDelivered: false,
      }),
    ).toBe(1);
  });
  it("moves to the test once the signature check is confirmed", () => {
    expect(
      webhookStep({
        hasEndpoint: true,
        active: false,
        configured: true,
        testDelivered: false,
      }),
    ).toBe(2);
  });
  it("moves to activation after a delivered test", () => {
    expect(
      webhookStep({
        hasEndpoint: true,
        active: false,
        configured: true,
        testDelivered: true,
      }),
    ).toBe(3);
  });
  it("is complete when active", () => {
    expect(
      webhookStep({
        hasEndpoint: true,
        active: true,
        configured: false,
        testDelivered: false,
      }),
    ).toBe(4);
  });
});
