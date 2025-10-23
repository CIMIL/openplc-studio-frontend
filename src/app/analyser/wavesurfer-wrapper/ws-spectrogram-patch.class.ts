import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram';

const monkeyPatchWsSpectrogram = (): typeof SpectrogramPlugin => {
  (SpectrogramPlugin as any).prototype.patchWidth = -1;
  (SpectrogramPlugin as any).prototype.getWidth = function (): number {
    console.log(`reading width ${this.patchWidth}`);

    if (this.patchWidth < 0) return this.wavesurfer.getWrapper().offsetWidth;

    return this.patchWidth;
  };
  (SpectrogramPlugin as any).prototype.setWidth = function (width: number): void {
    console.log(`setting width ${width}`);
    this.patchWidth = width;
  };
  return SpectrogramPlugin;
};

export default monkeyPatchWsSpectrogram();
