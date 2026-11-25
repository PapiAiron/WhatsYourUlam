import * as THREE from 'three';

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createWoodTexture(maxAniso = 4): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = '#7b5336';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 2) {
    const wave = Math.sin(y * 0.14) * 14 + Math.cos(y * 0.05) * 9;
    const tone = 104 + Math.round(Math.sin(y * 0.23) * 16);
    ctx.fillStyle = `rgb(${tone + 18}, ${Math.round(tone * 0.68)}, ${Math.round(tone * 0.42)})`;
    ctx.fillRect(0, y, 256, 2);
    if (y % 14 === 0) {
      ctx.fillStyle = 'rgba(42, 26, 15, 0.22)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + wave * 0.3, 170, y - wave * 0.3, 256, y);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(42, 26, 15, 0.24)';
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createClayTexture(maxAniso = 4): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = '#a3431b';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1600; i += 1) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const r = (i % 3) + 1;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(247, 241, 229, 0.07)' : 'rgba(42, 24, 14, 0.12)';
    ctx.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createWeaveTexture(maxAniso = 4): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = '#d7c39c';
  ctx.fillRect(0, 0, 256, 256);

  const step = 16;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const even = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = even ? '#c7ae80' : '#e4d3b0';
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAniso;
  return tex;
}

export function createTableLinenTexture(maxAniso = 4): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = '#efe6d5';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(198, 182, 153, 0.32)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAniso;
  return tex;
}
