import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "../app-sider";

// Mockea los componentes hijos si no tienen implementación
jest.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }) => <div data-testid="sidebar">{children}</div>,
  SidebarHeader: () => <div data-testid="sidebar-header" />,
  SidebarContent: ({ children }) => <div data-testid="sidebar-content">{children}</div>,
  SidebarFooter: () => <div data-testid="sidebar-footer" />,
  SidebarGroup: () => <div data-testid="sidebar-group" />,
}));

describe("AppSidebar", () => {
  test("se renderiza correctamente con sus secciones", () => {
    render(<AppSidebar />);

    // Verifica que los elementos del sidebar aparezcan
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-header")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument();

    // Verifica que existan dos grupos
    const groups = screen.getAllByTestId("sidebar-group");
    expect(groups.length).toBe(2);
  });
});
