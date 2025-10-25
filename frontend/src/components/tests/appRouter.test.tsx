import React from "react";
import { render, screen } from "@testing-library/react";
import AppRouter from "../AppRouter";

// Mocks de los componentes hijos
jest.mock("@/app/pages/Auth", () => () => <div>Auth Page</div>);
jest.mock("@/app/pages/Message", () => () => <div>Message Page</div>);
jest.mock("@/app/pages/Setting", () => () => <div>Settings Page</div>);
jest.mock("../ProtectedRoutes", () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

describe("AppRouter", () => {
  test("renders Message page (ruta raíz)", () => {
    render(<AppRouter />);
    expect(screen.getByText("Message Page")).toBeInTheDocument();
  });
});
