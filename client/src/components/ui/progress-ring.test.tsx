// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRing } from "./progress-ring";

describe("ProgressRing", () => {
  test("renders the rounded percentage label", () => {
    render(<ProgressRing progress={74.6} />);
    expect(screen.getByText("75%")).toBeDefined();
  });

  test("hides the label when showLabel is false", () => {
    render(<ProgressRing progress={50} showLabel={false} />);
    expect(screen.queryByText("50%")).toBeNull();
  });

  test("uses green stroke for high progress", () => {
    const { container } = render(<ProgressRing progress={95} />);
    expect(container.querySelector(".stroke-green-500")).not.toBeNull();
  });

  test("uses red stroke for low progress", () => {
    const { container } = render(<ProgressRing progress={20} />);
    expect(container.querySelector(".stroke-red-500")).not.toBeNull();
  });
});
