// atmosphere.js - Atmospheric elements like fireflies and dust particles

class Atmosphere {
    constructor() {
      // Firefly properties
      this.fireflies = [];
      this.maxFireflies = 30;
      this.fireflyColors = [
        [180, 255, 100], // Green-yellow
        [220, 255, 120], // Bright yellow
        [150, 220, 80],  // Soft green
        [180, 240, 150], // Pale green
        [200, 255, 160]  // Light green-yellow
      ];
      
      // Dust particle properties
      this.dustParticles = [];
      this.maxDustParticles = 500;
      this.dustColors = [
        [255, 255, 255, 40], // White
        [220, 220, 255, 30], // Light blue
        [255, 255, 220, 25], // Light yellow
        [220, 255, 220, 20]  // Light green
      ];
      
      // Initialize particles
      this.initParticles();
    }
    
    // Create initial particles
    initParticles() {
      // Create fireflies
      for (let i = 0; i < this.maxFireflies; i++) {
        this.fireflies.push(this.createFirefly());
      }
      
      // Create dust particles
      for (let i = 0; i < this.maxDustParticles; i++) {
        this.dustParticles.push(this.createDustParticle());
      }
    }
    
    // Create a new firefly
    createFirefly() {
      const colorIndex = floor(random(this.fireflyColors.length));
      
      return {
        x: random(width),
        y: random(height),
        size: random(2, 5),
        color: this.fireflyColors[colorIndex],
        glow: random(20, 50),
        alpha: random(100, 200),
        pulseRate: random(0.02, 0.05),
        pulseOffset: random(TWO_PI),
        speed: random(0.2, 1.0),
        angle: random(TWO_PI),
        sinOffset: random(TWO_PI),
        sinFrequency: random(0.01, 0.03),
        sinAmplitude: random(0.5, 2)
      };
    }
    
    // Create a new dust particle
    createDustParticle() {
      const colorIndex = floor(random(this.dustColors.length));
      
      return {
        x: random(width),
        y: random(height),
        size: random(0.5, 2),
        // size: 8,
        color: this.dustColors[colorIndex],
        speed: random(0.1, 0.3),
        angle: random(TWO_PI),
        sinOffset: random(TWO_PI),
        sinFrequency: random(0.005, 0.02),
        sinAmplitude: random(0.2, 0.8),
        lifespan: random(100, 300),
        age: 0
      };
    }
    
    // Update all particles
    update() {
      this.updateFireflies();
      this.updateDustParticles();
    }
    
    // Update firefly positions and states
    updateFireflies() {
      for (let i = 0; i < this.fireflies.length; i++) {
        const fly = this.fireflies[i];
        
        // Calculate pulse (breathing effect)
        const pulse = sin(frameCount * fly.pulseRate + fly.pulseOffset) * 0.5 + 0.5;
        fly.currentAlpha = fly.alpha * pulse;
        
        // Move in sinusoidal pattern
        fly.angle += random(-0.05, 0.05); // Slight random direction change
        
        // Calculate sin movement
        const sinValue = sin(frameCount * fly.sinFrequency + fly.sinOffset) * fly.sinAmplitude;
        
        // Calculate new position
        fly.x += cos(fly.angle) * fly.speed + sin(frameCount * 0.01 + fly.sinOffset) * 0.2;
        fly.y += sin(fly.angle) * fly.speed + sinValue * 0.1;
        
        // Wrap around screen edges with a buffer
        if (fly.x < -20) fly.x = width + 20;
        if (fly.x > width + 20) fly.x = -20;
        if (fly.y < -20) fly.y = height + 20;
        if (fly.y > height + 20) fly.y = -20;
        
        // Occasionally change direction completely
        if (random() < 0.005) {
          fly.angle = random(TWO_PI);
        }
      }
    }
    
    // Update dust particle positions and states
    updateDustParticles() {
      for (let i = this.dustParticles.length - 1; i >= 0; i--) {
        const dust = this.dustParticles[i];
        
        // Age the particle
        dust.age =+ 1;
        
        // Calculate alpha based on age
        dust.currentAlpha = map(
          constrain(min(dust.age, dust.lifespan - dust.age), 0, dust.lifespan / 4),
          0, dust.lifespan / 4,
          0, dust.color[3]
        );
        
        // Move in sinusoidal pattern (more gentle than fireflies)
        const sinValue = sin(frameCount * dust.sinFrequency + dust.sinOffset) * dust.sinAmplitude;
        
        // Calculate new position (dust moves slower and more delicately)
        dust.x += cos(dust.angle) * dust.speed + sinValue * 0.05;
        dust.y += sin(dust.angle) * dust.speed - dust.speed * 0.2; // Slight upward drift
        
        // Wrap around screen edges with buffer
        if (dust.x < -10) dust.x = width + 10;
        if (dust.x > width + 10) dust.x = -10;
        
        // Remove and replace particles that go off screen or die of old age
        if (dust.y < -10 || dust.y > height + 10 || dust.age > dust.lifespan) {
          // Replace with new particle entering from bottom
          this.dustParticles[i] = this.createDustParticle();
          // Start at bottom of screen
          this.dustParticles[i].y = height + random(5, 15);
        }
        
        // Occasionally change direction slightly
        if (random() < 0.02) {
          dust.angle += random(-0.1, 0.1);
        }
      }
    }
    
    // Draw all atmospheric elements
    draw() {
      this.drawDustParticles();
      this.drawFireflies();
    }
    
    // Draw fireflies with glowing effect
    drawFireflies() {
      push();
      noStroke();
      
      for (const fly of this.fireflies) {
        // Draw glow
        const glowSize = fly.size + fly.glow;
        
        // Draw radial gradient for glow
        drawingContext.globalAlpha = fly.currentAlpha / 255 * 0.3;
        const gradient = drawingContext.createRadialGradient(
          fly.x, fly.y, 0,
          fly.x, fly.y, glowSize
        );
        
        gradient.addColorStop(0, `rgba(${fly.color[0]}, ${fly.color[1]}, ${fly.color[2]}, 0.4)`);
        gradient.addColorStop(1, `rgba(${fly.color[0]}, ${fly.color[1]}, ${fly.color[2]}, 0)`);
        
        drawingContext.fillStyle = gradient;
        drawingContext.beginPath();
        drawingContext.arc(fly.x, fly.y, glowSize, 0, TWO_PI);
        drawingContext.fill();
        
        // Draw firefly core
        drawingContext.globalAlpha = fly.currentAlpha / 255;
        fill(fly.color[0], fly.color[1], fly.color[2]);
        ellipse(fly.x, fly.y, fly.size);
      }
      
      drawingContext.globalAlpha = 1.0;
      pop();
    }
    
    // Draw dust particles as subtle points
    drawDustParticles() {
      push();
        //   noStroke();
        strokeWeight(0.5);
        // stroke(255, 0, 0);  // bright red outline
      
      for (const dust of this.dustParticles) {
        const alpha = dust.currentAlpha;
        fill(dust.color[0], dust.color[1], dust.color[2], alpha);
        ellipse(dust.x, dust.y, dust.size);
      }
      
      pop();
    }

    drawDustDebug() {
        push();
        strokeWeight(2);
        stroke(255, 0, 0);  // bright red outline
        
        for (const dust of this.dustParticles) {
          // Draw a very visible version of each dust particle
          fill(255, 255, 0);  // bright yellow
          ellipse(dust.x, dust.y, 5, 5);  // larger size
        }
        
        // Print stats about dust particles
        fill(255);
        noStroke();
        textSize(16);
        text(`Dust particles: ${this.dustParticles.length}`, 20, 60);
        
        pop();
      }
    
    // Add more fireflies or dust in a specific area (e.g., around plants or hand)
    addLocalEffect(x, y, type = 'dust', count = 5) {
      const radius = 50;
      
      if (type === 'dust') {
        for (let i = 0; i < count; i++) {
          const angle = random(TWO_PI);
          const distance = random(5, radius);
          const dust = this.createDustParticle();
          
          dust.x = x + cos(angle) * distance;
          dust.y = y + sin(angle) * distance;
          dust.speed *= 1.5; // Faster movement for effect dust
          
          this.dustParticles.push(dust);
          
          // Remove oldest dust particles if we exceed the maximum
          if (this.dustParticles.length > this.maxDustParticles + 50) {
            this.dustParticles.shift();
          }
        }
      } else if (type === 'firefly') {
        for (let i = 0; i < count; i++) {
          const angle = random(TWO_PI);
          const distance = random(5, radius);
          const fly = this.createFirefly();
          
          fly.x = x + cos(angle) * distance;
          fly.y = y + sin(angle) * distance;
          
          this.fireflies.push(fly);
          
          // Remove oldest fireflies if we exceed the maximum
          if (this.fireflies.length > this.maxFireflies + 10) {
            this.fireflies.shift();
          }
        }
      }
    }
    
    // Window resized handler
    windowResized() {
      // Adjust particles to the new window size
      for (const fly of this.fireflies) {
        // Keep particles within new bounds
        fly.x = constrain(fly.x, 0, width);
        fly.y = constrain(fly.y, 0, height);
      }
      
      for (const dust of this.dustParticles) {
        // Keep particles within new bounds
        dust.x = constrain(dust.x, 0, width);
        dust.y = constrain(dust.y, 0, height);
      }
    }
  }