// @vitest-environment jsdom
vi.mock('@google/model-viewer', () => ({}));

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArViewer } from './ArViewer';

describe('ArViewer', () => {
  it('renders a model-viewer element with the right attributes', () => {
    render(
      <ArViewer
        name="Chair"
        glbUrl="https://blob.example/chair.glb"
        usdzUrl="https://blob.example/chair.usdz"
        posterUrl="https://blob.example/chair-poster.png"
      />,
    );

    const viewer = screen.getByTestId('ar-viewer');
    expect(viewer.tagName.toLowerCase()).toBe('model-viewer');
    expect(viewer.getAttribute('src')).toBe('https://blob.example/chair.glb');
    expect(viewer.getAttribute('ios-src')).toBe('https://blob.example/chair.usdz');
    expect(viewer.getAttribute('alt')).toBe('Chair');
    expect(viewer.getAttribute('ar-modes')).toBe('webxr scene-viewer quick-look');
  });

  it('omits ios-src when no usdzUrl is provided', () => {
    render(<ArViewer name="Chair" glbUrl="https://blob.example/chair.glb" />);
    const viewer = screen.getByTestId('ar-viewer');
    expect(viewer.hasAttribute('ios-src')).toBe(false);
  });
});
