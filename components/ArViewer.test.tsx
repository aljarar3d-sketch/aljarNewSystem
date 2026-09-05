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

  it('defaults viewer settings to match the prior hardcoded behavior', () => {
    render(<ArViewer name="Chair" glbUrl="https://blob.example/chair.glb" />);
    const viewer = screen.getByTestId('ar-viewer');
    expect(viewer.getAttribute('shadow-intensity')).toBe('1');
    expect(viewer.getAttribute('shadow-softness')).toBe('1');
    expect(viewer.getAttribute('exposure')).toBe('1');
    expect(viewer.getAttribute('tone-mapping')).toBe('auto');
    expect(viewer.hasAttribute('auto-rotate')).toBe(true);
    expect(viewer.hasAttribute('skybox-image')).toBe(false);
  });

  it('passes through custom viewer settings', () => {
    render(
      <ArViewer
        name="Chair"
        glbUrl="https://blob.example/chair.glb"
        shadowIntensity={0.5}
        shadowSoftness={0.25}
        exposure={1.5}
        toneMapping="neutral"
        autoRotate={false}
        skyboxImage="https://blob.example/room.jpg"
      />,
    );
    const viewer = screen.getByTestId('ar-viewer');
    expect(viewer.getAttribute('shadow-intensity')).toBe('0.5');
    expect(viewer.getAttribute('shadow-softness')).toBe('0.25');
    expect(viewer.getAttribute('exposure')).toBe('1.5');
    expect(viewer.getAttribute('tone-mapping')).toBe('neutral');
    expect(viewer.hasAttribute('auto-rotate')).toBe(false);
    expect(viewer.getAttribute('skybox-image')).toBe('https://blob.example/room.jpg');
  });

  describe('autoLaunchAr', () => {
    // The real custom element isn't registered in this mocked environment, so
    // `canActivateAR`/`activateAR` don't exist on the plain DOM node jsdom
    // creates — stub them the way the real element would expose them.
    function stubArSupport(element: Element, canActivateAR: boolean) {
      const activateAR = vi.fn().mockResolvedValue(undefined);
      Object.assign(element, { canActivateAR, activateAR });
      return activateAR;
    }

    it('calls activateAR on load when enabled and AR is available', () => {
      render(<ArViewer name="Chair" glbUrl="https://blob.example/chair.glb" autoLaunchAr />);
      const viewer = screen.getByTestId('ar-viewer');
      const activateAR = stubArSupport(viewer, true);

      viewer.dispatchEvent(new Event('load'));

      expect(activateAR).toHaveBeenCalledTimes(1);
    });

    it('does not call activateAR when the platform cannot activate AR', () => {
      render(<ArViewer name="Chair" glbUrl="https://blob.example/chair.glb" autoLaunchAr />);
      const viewer = screen.getByTestId('ar-viewer');
      const activateAR = stubArSupport(viewer, false);

      viewer.dispatchEvent(new Event('load'));

      expect(activateAR).not.toHaveBeenCalled();
    });

    it('does not auto-launch when the prop is left at its default (admin previews)', () => {
      render(<ArViewer name="Chair" glbUrl="https://blob.example/chair.glb" />);
      const viewer = screen.getByTestId('ar-viewer');
      const activateAR = stubArSupport(viewer, true);

      viewer.dispatchEvent(new Event('load'));

      expect(activateAR).not.toHaveBeenCalled();
    });
  });
});
