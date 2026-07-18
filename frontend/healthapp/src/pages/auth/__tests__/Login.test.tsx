import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Login from "../Login";
import { loginUser } from "../../../api/auth.api";

jest.mock("../../../api/auth.api", () => ({
  loginUser: jest.fn(),
  verifyLogin2FA: jest.fn(),
}));

jest.mock("../../../utils/auth", () => ({
  setAuth: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe("Login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the email and password form", () => {
    renderLogin();

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the two-factor code step when the API requires 2FA", async () => {
    jest.mocked(loginUser).mockResolvedValueOnce({
      data: { requires2FA: true, email: "patient@example.com" },
    } as never);

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "patient@example.com");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("------")).toBeInTheDocument();
    });
  });

  it("surfaces invalid credential errors", async () => {
    const toast = (await import("react-hot-toast")).default as unknown as {
      error: jest.Mock;
    };
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.mocked(loginUser).mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "bad@example.com");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
  });
});
