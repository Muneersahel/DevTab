/**
 * Global Vitest setup (runs after Angular's init-testbed). jsdom does not
 * implement Canvas 2D, which Chart.js touches when dashboard widgets render.
 */
const origGetContext = HTMLCanvasElement.prototype.getContext;

function stubCanvasGradient(): CanvasGradient {
  return {
    addColorStop: () => undefined,
  } as unknown as CanvasGradient;
}

function stub2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return {
    canvas,
    createLinearGradient: () => stubCanvasGradient(),
    createRadialGradient: () => stubCanvasGradient(),
    createConicGradient: () => stubCanvasGradient(),
    fillRect: () => undefined,
    clearRect: () => undefined,
    getImageData: () => new ImageData(1, 1),
    putImageData: () => undefined,
    createImageData: (sw: number, sh?: number) => new ImageData(sw, sh ?? sw),
    drawImage: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    stroke: () => undefined,
    fill: () => undefined,
    arc: () => undefined,
    rect: () => undefined,
    clip: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    translate: () => undefined,
    transform: () => undefined,
    setTransform: () => undefined,
    resetTransform: () => undefined,
    measureText: () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
    fillText: () => undefined,
    strokeText: () => undefined,
    isContextLost: () => false,
  } as unknown as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
  ...args: unknown[]
): CanvasRenderingContext2D | null {
  if (contextId === '2d') {
    return stub2dContext(this);
  }

  return Reflect.apply(origGetContext, this, [
    contextId,
    ...args,
  ]) as CanvasRenderingContext2D | null;
} as unknown as typeof HTMLCanvasElement.prototype.getContext;
