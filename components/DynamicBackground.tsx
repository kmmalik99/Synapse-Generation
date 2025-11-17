import React, { useRef, useEffect } from 'react';

const DynamicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    const particleCount = 50;
    const colors = ['#10B981', '#06B6D4', '#34D399', '#6366F1'];
    const chars = ['<>', '{}', '/>', '!', '()', '=>', '*', '::', '#'];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      type: 'shape' | 'text';
      char: string;
      rotation: number;
      rotationSpeed: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = Math.random() * 0.4 - 0.2;
        this.vy = Math.random() * 0.4 - 0.2;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        if (Math.random() > 0.5) {
            this.type = 'text';
            this.char = chars[Math.floor(Math.random() * chars.length)];
            this.size = Math.random() * 12 + 10; // font size
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = Math.random() * 0.02 - 0.01;
        } else {
            this.type = 'shape';
            this.char = ''; // not used for shapes
            this.size = Math.random() * 2 + 1; // radius
            this.rotation = 0;
            this.rotationSpeed = 0;
        }
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx!.save();
        ctx!.translate(this.x, this.y);
        ctx!.rotate(this.rotation);
        
        if (this.type === 'text') {
            ctx!.font = `${this.size}px 'Roboto Mono', monospace`;
            ctx!.fillStyle = this.color;
            ctx!.globalAlpha = 0.8;
            ctx!.textAlign = 'center';
            ctx!.textBaseline = 'middle';
            ctx!.fillText(this.char, 0, 0);
        } else { // shape
            ctx!.beginPath();
            ctx!.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx!.fillStyle = this.color;
            ctx!.globalAlpha = 0.6;
            ctx!.fill();
        }

        ctx!.restore();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };
    
    let animationFrameId: number;
    const animate = () => {
      ctx!.fillStyle = '#f8fafc'; // tailwind slate-50
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
        resizeCanvas();
        init();
    }
    
    window.addEventListener('resize', handleResize);

    resizeCanvas();
    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -10, backgroundColor: '#f8fafc' }} />;
};

export default DynamicBackground;