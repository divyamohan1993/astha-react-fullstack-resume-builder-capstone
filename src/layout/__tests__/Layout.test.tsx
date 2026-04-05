/**
 * Tests for Layout, Navbar, and Footer components.
 * Covers: branding, navigation links, theme toggle, skip-to-content, logo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';

describe('Layout with Navbar and Footer', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('light');
  });

  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    );
  }

  it('renders Navbar with "ResumeAI" text', () => {
    renderLayout();
    expect(screen.getAllByText('ResumeAI').length).toBeGreaterThan(0);
  });

  it('renders Footer with "Astha Chandel"', () => {
    renderLayout();
    expect(screen.getByText('Astha Chandel')).toBeInTheDocument();
  });

  it('renders Shoolini University logo', () => {
    renderLayout();
    const logos = screen.getAllByAltText(/Shoolini University/i);
    expect(logos.length).toBeGreaterThan(0);
  });

  it('theme toggle button present', () => {
    renderLayout();
    const toggleBtn = screen.getByRole('button', { name: /switch to/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it('skip-to-content link present', () => {
    renderLayout();
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
  });

  it('navigation links (Home, Builder, Employer) present', () => {
    renderLayout();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Builder')).toBeInTheDocument();
    expect(screen.getByText('Employer')).toBeInTheDocument();
  });

  it('main content area has correct id', () => {
    const { container } = renderLayout();
    expect(container.querySelector('#main-content')).toBeInTheDocument();
  });
});
