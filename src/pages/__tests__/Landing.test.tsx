/**
 * Tests for the Landing page.
 * Covers: hero heading, student/recruiter cards, feature pills.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Landing } from '../Landing';

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe('Landing page', () => {
  it('renders hero heading', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Your Resume/)).toBeInTheDocument();
  });

  it('renders "I\'m a Student" card', () => {
    renderLanding();
    expect(screen.getByText("I'm a Student")).toBeInTheDocument();
  });

  it('student card links to /builder', () => {
    renderLanding();
    const studentCard = screen.getByText("I'm a Student").closest('a');
    expect(studentCard).toHaveAttribute('href', '/builder');
  });

  it('renders "I\'m a Recruiter" card', () => {
    renderLanding();
    expect(screen.getByText("I'm a Recruiter")).toBeInTheDocument();
  });

  it('recruiter card links to /employer', () => {
    renderLanding();
    const recruiterCard = screen.getByText("I'm a Recruiter").closest('a');
    expect(recruiterCard).toHaveAttribute('href', '/employer');
  });

  it('renders feature pills', () => {
    renderLanding();
    expect(screen.getByText('100% Offline')).toBeInTheDocument();
    expect(screen.getByText('In-Browser AI')).toBeInTheDocument();
    expect(screen.getByText('WCAG 2.2 AAA')).toBeInTheDocument();
    expect(screen.getByText('Research-Backed Scoring')).toBeInTheDocument();
    expect(screen.getByText('Zero Server Cost')).toBeInTheDocument();
  });

  it('renders Start Building CTA', () => {
    renderLanding();
    expect(screen.getByText('Start Building')).toBeInTheDocument();
  });

  it('renders Analyze Candidates CTA', () => {
    renderLanding();
    expect(screen.getByText('Analyze Candidates')).toBeInTheDocument();
  });
});
