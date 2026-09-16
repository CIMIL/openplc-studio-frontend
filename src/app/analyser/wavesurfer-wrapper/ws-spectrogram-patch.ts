import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram.js';

const monkeyPatchWsSpectrogram = (): typeof SpectrogramPlugin => {
  (SpectrogramPlugin as any).prototype.drawSpectrogram = function (frequenciesData: any): void {
    if (!isNaN(frequenciesData[0][0])) {
      // data is 1ch [sample, freq] format
      // to [channel, sample, freq] format
      frequenciesData = [frequenciesData];
    }

    // Clear existing canvases
    this.clearCanvases();

    // Set the height to fit all channels
    const totalHeight = this.height * frequenciesData.length;
    this.wrapper.style.height = totalHeight + 'px';

    const totalWidth = this.getWidth();
    const maxCanvasWidth = Math.min((SpectrogramPlugin as any).MAX_CANVAS_WIDTH, totalWidth);

    // Nothing to render
    if (totalWidth === 0 || totalHeight === 0) return;

    // Calculate number of canvases needed
    const numCanvases = Math.ceil(totalWidth / maxCanvasWidth);

    // Smart resampling based on zoom level
    let resampledData: Uint8Array[][];
    const originalDataWidth = frequenciesData[0]?.length || 0;
    const needsResampling = totalWidth !== originalDataWidth;

    if (!needsResampling) {
      // At high zoom levels, use original data directly - much faster!
      resampledData = frequenciesData;
    } else if (this.cachedResampledData && this.cachedWidth === totalWidth) {
      // Use cached resampled data
      resampledData = this.cachedResampledData;
    } else {
      // Only resample when actually needed
      resampledData = this.efficientResample(frequenciesData, totalWidth);
      this.cachedResampledData = resampledData;
      this.cachedWidth = totalWidth;
    }

    // Maximum frequency represented in `frequenciesData`
    // Use buffer.sampleRate if available (from getFrequencies), otherwise use the provided sampleRate
    const freqFrom = this.buffer?.sampleRate ? this.buffer.sampleRate / 2 : (this.options.sampleRate || 0) / 2;

    // Minimum and maximum frequency we want to draw
    const freqMin = this.frequencyMin;
    const freqMax = this.frequencyMax;

    // Draw background if needed
    const shouldDrawBackground = freqMax > freqFrom;
    const bgColor = shouldDrawBackground ? this.colorMap[this.colorMap.length - 1] : null;

    // Function to draw a single canvas
    const drawCanvas = (canvasIndex: number) => {
      if (canvasIndex < 0 || canvasIndex >= numCanvases) return;
      if (this.drawnCanvases[canvasIndex]) return;

      this.drawnCanvases[canvasIndex] = true;

      const offset = canvasIndex * maxCanvasWidth;
      const canvasWidth = Math.min(maxCanvasWidth, totalWidth - offset);

      if (canvasWidth <= 0) return;

      const canvas = this.createSingleCanvas(canvasWidth, totalHeight, offset);
      this.canvases.push(canvas);
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Draw background if needed
      if (shouldDrawBackground && bgColor) {
        ctx.fillStyle = `rgba(${bgColor[0] * 255}, ${bgColor[1] * 255}, ${bgColor[2] * 255}, ${bgColor[3]})`;
        ctx.fillRect(0, 0, canvasWidth, totalHeight);
      }

      // Render each channel for this canvas segment
      for (let c = 0; c < resampledData.length; c++) {
        this.drawSpectrogramSegment(
          resampledData[c],
          ctx,
          canvasWidth,
          this.height,
          c * this.height,
          offset,
          totalWidth,
          freqFrom,
          freqMin,
          freqMax,
        );
      }
    };

    // Store rendering parameters for lazy loading
    this.isScrollable = totalWidth > this.getWrapperWidth();

    // Clear previous scroll listener
    if (this.scrollUnsubscribe) {
      this.scrollUnsubscribe();
      this.scrollUnsubscribe = null;
    }

    if (!this.isScrollable || numCanvases <= 3) {
      // Draw all canvases if not scrollable or few canvases
      for (let i = 0; i < numCanvases; i++) {
        drawCanvas(i);
      }
    } else {
      // Implement lazy rendering with scroll listener
      const renderVisibleCanvases = () => {
        const wrapper = this.wavesurfer?.getWrapper();
        if (!wrapper) return;

        const scrollLeft = wrapper.scrollLeft || 0;
        const containerWidth = wrapper.clientWidth || 0;

        // Calculate visible range with some buffer
        const bufferRatio = 0.5; // Render 50% extra on each side
        const visibleStart = Math.max(0, scrollLeft - containerWidth * bufferRatio);
        const visibleEnd = Math.min(totalWidth, scrollLeft + containerWidth * (1 + bufferRatio));

        const startCanvasIndex = Math.floor((visibleStart / totalWidth) * numCanvases);
        const endCanvasIndex = Math.min(Math.ceil((visibleEnd / totalWidth) * numCanvases), numCanvases - 1);

        // Clear excess canvases if we have too many
        if (Object.keys(this.drawnCanvases).length > (SpectrogramPlugin as any).MAX_NODES) {
          this.clearExcessCanvases();
        }

        // Draw visible canvases
        for (let i = startCanvasIndex; i <= endCanvasIndex; i++) {
          drawCanvas(i);
        }
      };

      // Initial render of visible canvases
      renderVisibleCanvases();

      // Set up scroll listener for lazy loading
      let scrollTimeout: number | null = null;
      const onScroll = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(renderVisibleCanvases, 16); // 60fps
      };

      const wrapper = this.wavesurfer?.getWrapper();
      if (wrapper) {
        wrapper.addEventListener('scroll', onScroll, { passive: true });
        this.scrollUnsubscribe = () => {
          wrapper.removeEventListener('scroll', onScroll);
          if (scrollTimeout) clearTimeout(scrollTimeout);
        };
      }
    }

    if (this.options.labels) {
      this.loadLabels(
        this.options.labelsBackground,
        '12px',
        '12px',
        '',
        this.options.labelsColor,
        this.options.labelsHzColor || this.options.labelsColor,
        'center',
        '#specLabels',
        frequenciesData.length,
      );
    }

    this.emit('ready');
  };

  return SpectrogramPlugin;
};

export default monkeyPatchWsSpectrogram();
