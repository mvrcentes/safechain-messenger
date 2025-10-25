import React from "react";
import { render, screen } from "@testing-library/react";
import App from "../../App";

describe("App Component", () => {
  test("renders the App text", () => {
    render(<App />);
    const divElement = screen.getByText(/App/i); // Busca el texto "App"
    expect(divElement).toBeInTheDocument(); // Verifica que esté en el DOM
  });

  test("renders a div element", () => {
    render(<App />);
    const divElement = screen.getByText("App").closest("div");
    expect(divElement).toBeTruthy(); // Verifica que sea un div
  });
});
