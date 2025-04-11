// garden.js - Enhanced garden with Matter.js physics integration and theme control

class EnhancedGarden {
  constructor() {
    this.plants = [];
    this.maxPlants = 18; // Further reduced for better performance with Matter.js
    this.lastPlantTime = 0;
    this.minTimeBetweenPlants = 600; // Increased to prevent overloading physics
    
    // Available plant types
    this.plantTypes = [
      'simple', 'tree', 'fern', 'bush', 'flower', 
      'cherry', 'cactus', 'thickbush', 'berry', 'crystal'
    ];
    
    // Current theme
    this.currentTheme = 'mixed'; // Default to mixed
  }
  
  // Set garden theme
  setTheme(theme) {
    if (theme === 'mixed' || this.plantTypes.includes(theme)) {
      this.currentTheme = theme;
      return true;
    }
    return false;
  }
  
  // Create a new plant
  createPlant(x, y, type = null) {
    try {
      // Enforce time between plant creation
      const currentTime = millis();
      if (currentTime - this.lastPlantTime < this.minTimeBetweenPlants) {
        return null;
      }
      this.lastPlantTime = currentTime;
      
      // Remove oldest plant if at capacity
      if (this.plants.length >= this.maxPlants) {
        if (this.plants.length > 0) {
          this.plants[0].destroy(); // Clean up physics
          this.plants.shift();
        }
      }
      
      // Handle themed planting
      if (!type) {
        if (this.currentTheme === 'mixed') {
          // For mixed theme, choose random
          type = this.getRandomType();
        } else {
          // Use the current theme
          type = this.currentTheme;
        }
      }
      
      // Create new plant
      const plant = new ToxicPlant(x, y, type);
      this.plants.push(plant);
      
      return plant;
    } catch (e) {
      console.error("Error creating plant:", e);
      return null;
    }
  }
  
  // Update all plants
  update() {
    // Update individual plant physics with error handling
    for (let i = this.plants.length - 1; i >= 0; i--) {
      try {
        this.plants[i].update();
      } catch (e) {
        console.error(`Error updating plant ${i}:`, e);
        // Remove problematic plant
        try {
          this.plants[i].destroy();
        } catch (destroyError) {
          console.error("Error destroying plant:", destroyError);
        }
        this.plants.splice(i, 1);
      }
    }
  }
  
  // Draw all plants
  draw() {
    for (let i = 0; i < this.plants.length; i++) {
      try {
        this.plants[i].draw();
      } catch (e) {
        console.error(`Error drawing plant ${i}:`, e);
      }
    }
  }
  
  // Draw debug visualization
  drawDebug() {
    for (let i = 0; i < this.plants.length; i++) {
      try {
        this.plants[i].drawDebug();
      } catch (e) {
        console.error(`Error drawing plant debug ${i}:`, e);
      }
    }
  }
  
  // Clear all plants
  clearPlants() {
    // Clean up physics for each plant with error handling
    for (let i = 0; i < this.plants.length; i++) {
      try {
        this.plants[i].destroy();
      } catch (e) {
        console.error(`Error destroying plant ${i}:`, e);
      }
    }
    this.plants = [];
  }
  
  // Create multiple plants with staggered timing and error handling
  createMultiplePlants(count = 3, typeOverride = null) {
    // Limit count for better performance
    count = Math.min(count, 4);
    
    // Schedule plant creation
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        try {
          const x = random(width * 0.1, width * 0.9);
          const type = typeOverride || (this.currentTheme === 'mixed' ? this.getRandomType() : this.currentTheme);
          this.createPlant(x, height - 10, type);
        } catch (e) {
          console.error(`Error in scheduled plant creation:`, e);
        }
      }, i * 800); // Increased delay for better physics performance
    }
  }
  
  // Get a random plant type with error handling
  getRandomType() {
    try {
      return this.plantTypes[floor(random(this.plantTypes.length))];
    } catch (e) {
      console.error("Error getting random plant type:", e);
      return 'simple'; // Fallback to simple
    }
  }
  
  // Get total particle count with error handling
  getParticleCount() {
    try {
      let count = 0;
      for (let i = 0; i < this.plants.length; i++) {
        if (this.plants[i] && this.plants[i].physics && this.plants[i].physics.bodies) {
          count += this.plants[i].physics.bodies.length;
        }
      }
      return count;
    } catch (e) {
      console.error("Error counting particles:", e);
      return 0;
    }
  }
  
  // Get total spring count with error handling
  getSpringCount() {
    try {
      let count = 0;
      for (let i = 0; i < this.plants.length; i++) {
        if (this.plants[i] && this.plants[i].physics && this.plants[i].physics.springs) {
          count += this.plants[i].physics.springs.length;
        }
      }
      return count;
    } catch (e) {
      console.error("Error counting springs:", e);
      return 0;
    }
  }
  
  // Get current theme
  getCurrentTheme() {
    return this.currentTheme;
  }
  
  // Cycle to next theme
  cycleTheme() {
    const themes = ['mixed', ...this.plantTypes];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.currentTheme = themes[nextIndex];
    return this.currentTheme;
  }
  
  // Get access to Matter.js world (for interactive elements)
  getSharedWorld() {
    try {
      // Return the world of the first plant (if any)
      if (this.plants.length > 0 && this.plants[0].physics) {
        return this.plants[0].physics.world;
      }
    } catch (e) {
      console.error("Error getting shared world:", e);
    }
    return null;
  }
}