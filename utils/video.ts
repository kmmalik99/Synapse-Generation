/**
 * Extracts frames from a video file at a specified frames per second (fps).
 * @param videoUrl The URL of the video file.
 * @param fps The number of frames to extract per second.
 * @param maxFrames The maximum number of frames to extract.
 * @returns A promise that resolves with an array of base64 encoded frame data URLs.
 */
export const extractFramesFromVideo = (
    videoUrl: string,
    fps: number,
    maxFrames: number
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
  
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const frames: string[] = [];
  
      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        let currentTime = 0;
        const interval = 1 / fps;
        
        const captureFrame = () => {
          if (currentTime > video.duration || frames.length >= maxFrames) {
            video.pause();
            resolve(frames);
            return;
          }
  
          video.currentTime = currentTime;
        };
  
        video.addEventListener('seeked', () => {
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Get frame as JPEG data URL
            frames.push(canvas.toDataURL('image/jpeg', 0.8)); 
          }
          currentTime += interval;
          // Wait for the next frame
          requestAnimationFrame(captureFrame);
        });

        video.addEventListener('error', (e) => {
            reject(new Error('Failed to load or process video.'));
        });
  
        // Start the process
        video.play().then(() => {
            // Need to play and pause to ensure the first frame is available
            video.pause();
            captureFrame();
        }).catch(reject);
      });
  
      video.load();
    });
  };
  