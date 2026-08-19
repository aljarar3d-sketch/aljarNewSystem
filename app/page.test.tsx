// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('renders the platform heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'AR Asset Platform' })).toBeInTheDocument();
  });
});
