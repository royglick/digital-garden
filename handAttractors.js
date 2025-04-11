
// handAttractors.js - Hand interaction with pinch-based attraction

class HandAttractors {
    constructor(garden) {
      this.garden = garden;
      this.attractors = [];
      this.enabled = true;
      this.lastInteractionTime = 0;
      this.interactionCooldown = 100; // Milliseconds
      
      // Attractor properties
      this.attractionStrength = 0.2; // Attraction strength
      this.attractionRadius = 60; // Attraction radius in pixels
      this.maxForce = 0.1; // Maximum force to apply
      
      // Pinch state
      this.isPinching = false;
      this.pinchPosition = { x: 0, y: 0 };
      
      // Theme button properties
      this.themeButton = {
        x: windowWidth - 50,
        y: 50,
        radius: 30,
        color: color(100, 200, 255, 150),
        hoverColor: color(150, 220, 255, 200),
        isHovered: false,
        lastTriggerTime: 0,
        cooldown: 500 // ms between triggers
      };
    }
    
    // Update with the latest hand data
    update(hands) {
      // Clear previous attractors
      this.attractors = [];
      this.isPinching = false;
      
      // If no hands or attractors disabled, return
      if (!this.enabled || hands.length === 0) {
        return;
      }
      
      const hand = hands[0];
      
      // Update theme button hover state with index finger
      this.updateThemeButtonState(hand);
      
      // Check for pinch gesture
      if (hand.thumb_tip && hand.index_finger_tip) {
        // Calculate pinch center position
        const thumbTip = hand.thumb_tip;
        const indexTip = hand.index_finger_tip;
        
        // Calculate distance between thumb and index finger
        const distance = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
        
        // Pinch detected if distance is small
        this.isPinching = distance < 35; // Increased threshold for easier detection
        
        if (this.isPinching) {
          // Calculate pinch center
          this.pinchPosition = {
            x: (thumbTip.x + indexTip.x) / 2,
            y: (thumbTip.y + indexTip.y) / 2
          };
          
          // Add attractor at pinch position
          this.attractors.push({
            position: this.pinchPosition,
            name: 'pinch',
            strength: this.attractionStrength
          });
          
          // Apply attraction to plants
          this.applyAttractionToPlants();
        }
      }
      
      // Check for planting interaction (index finger at bottom)
      this.checkPlantInteractions(hand);
    }
    
    // Update theme button state
    updateThemeButtonState(hand) {
      if (!hand || !hand.index_finger_tip) return;
      
      const indexTip = hand.index_finger_tip;
      const distance = dist(indexTip.x, indexTip.y, this.themeButton.x, this.themeButton.y);
      
      // Update hover state
      this.themeButton.isHovered = distance < this.themeButton.radius;
      
      // Trigger theme change if hovering
      if (this.themeButton.isHovered) {
        const now = Date.now();
        if (now - this.themeButton.lastTriggerTime > this.themeButton.cooldown) {
          const newTheme = this.garden.cycleTheme();
          console.log("Theme button pressed - changed to: " + newTheme);
          this.themeButton.lastTriggerTime = now;
          
          // Update any UI elements
          this.updateThemeUI();
        }
      }
    }
    
    // Update theme UI elements
    updateThemeUI() {
      const themeIndicator = document.getElementById('theme-indicator');
      if (themeIndicator) {
        themeIndicator.textContent = `Theme: ${this.garden.getCurrentTheme()}`;
      }
    }
    
    // Apply attraction forces to plants - only with pinch
    applyAttractionToPlants() {
      // Skip if not pinching
      if (!this.isPinching || this.attractors.length === 0) return;
      
      // For each plant in the garden
      for (const plant of this.garden.plants) {
        // Skip if plant doesn't have physics or particles
        if (!plant.physics || !plant.physics.bodies) continue;
        
        // Get the pinch attractor
        const attractor = this.attractors[0];
        
        // Apply to each body in the plant
        for (const body of plant.physics.bodies) {
          // Skip fixed/static bodies
          if (body.isStatic) continue;
          
          // Calculate distance between body and attractor
          const dx = attractor.position.x - body.position.x;
          const dy = attractor.position.y - body.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // If within attraction radius
          if (distance < this.attractionRadius) {
            // Calculate force based on distance (closer = stronger)
            const force = attractor.strength * (1 - distance / this.attractionRadius);
            const forceMagnitude = Math.min(force, this.maxForce); // Cap maximum force
            
            // Normalize direction
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Apply attraction force
            Matter.Body.applyForce(body, body.position, {
              x: dirX * forceMagnitude,
              y: dirY * forceMagnitude
            });
          }
        }
      }
    }
    
    // Check for planting interaction
    checkPlantInteractions(hand) {
      // If too soon since last interaction, skip
      const now = Date.now();
      if (now - this.lastInteractionTime < this.interactionCooldown) {
        return;
      }
      
      // Check if index finger is near bottom of screen to plant
      if (hand && hand.index_finger_tip) {
        const indexFinger = hand.index_finger_tip;
        if (indexFinger.y > height - 20) {
          this.garden.createPlant(indexFinger.x, height - 10);
          this.lastInteractionTime = now;
        }
      }
    }
    
    // Draw the theme selection button
    drawThemeButton() {
      push();
      // Draw button background
      if (this.themeButton.isHovered) {
        fill(this.themeButton.hoverColor);
      } else {
        fill(this.themeButton.color);
      }
      strokeWeight(2);
      stroke(255, 255, 255, 150);
      ellipse(this.themeButton.x, this.themeButton.y, this.themeButton.radius * 2);
      
      // Draw icon or text inside the button
      noStroke();
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(12);
      text("THEME", this.themeButton.x, this.themeButton.y);
      
      // Draw current theme text below
      textSize(14);
      fill(255, 255, 255, 200);
      text(this.garden.getCurrentTheme(), this.themeButton.x, this.themeButton.y + this.themeButton.radius + 15);
      
      pop();
    }
    
    // Toggle attractors
    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }
    
    // Set attraction strength
    setStrength(strength) {
      this.attractionStrength = Math.max(0.0001, Math.min(0.5, strength));
      return this.attractionStrength;
    }
    
    // Set attraction radius
    setRadius(radius) {
      this.attractionRadius = Math.max(10, Math.min(200, radius));
      return this.attractionRadius;
    }
    
    // Draw debug visualization
    drawDebug() {
      push();
      
      // Draw pinch visualization if pinching
      if (this.isPinching) {
        // Draw attraction radius
        noFill();
        stroke(100, 200, 255, 100);
        strokeWeight(1);
        ellipse(this.pinchPosition.x, this.pinchPosition.y, this.attractionRadius * 2);
        
        // Draw attractor point
        fill(0, 255, 255);
        noStroke();
        ellipse(this.pinchPosition.x, this.pinchPosition.y, 12);
        
        // Label the attractor
        fill(255);
        textSize(10);
        textAlign(CENTER);
        text("PINCH", this.pinchPosition.x, this.pinchPosition.y - 15);
      }
      
      // Draw theme button debug info
      stroke(255, 100, 100);
      noFill();
      ellipse(this.themeButton.x, this.themeButton.y, this.themeButton.radius * 2 + 5);
      fill(255);
      noStroke();
      textAlign(LEFT);
      textSize(12);
      text(`Theme button hover: ${this.themeButton.isHovered}`, 10, height - 220);
      
      // Draw attraction settings
      fill(255);
      textSize(12);
      textAlign(LEFT);
      text(`Attraction Strength: ${this.attractionStrength.toFixed(4)}`, 10, height - 180);
      text(`Attraction Radius: ${this.attractionRadius}px`, 10, height - 200);
      text(`Pinching: ${this.isPinching ? 'YES' : 'no'}`, 10, height - 240);
      
      pop();
    }
    
    // Handle window resize
    windowResized() {
      // Update theme button position when window is resized
      this.themeButton.x = windowWidth - 50;
    }
  }