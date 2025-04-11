

// lsystem.js - Expanded L-system implementation with more plant variations

class LSystem {
  constructor(config = {}) {
    this.axiom = config.axiom || 'F';
    this.rules = config.rules || { 'F': 'FF+[+F]-[-F]' };
    this.angle = config.angle || (PI / 7);
    this.iterations = Math.min(config.iterations || 2, 4); // Max 4 iterations for performance
    this.segments = [];
    this.colorVariation = config.colorVariation || false;
    this.fruitProbability = config.fruitProbability || 0;
    this.fruitColor = config.fruitColor || color(255, 50, 50);
    this.leafColor = config.leafColor || color(100, 220, 50);
    this.stemColor = config.stemColor || color(80, 120, 40);
    this.colorThemes = {
      // Natural themes
      simple: {
        stem: color(80, 120, 40),
        leaf: color(100, 220, 50),
        fruit: color(255, 50, 50),
        variation: true,
        glowIntensity: 0.2
      },
      tree: {
        stem: color(100, 70, 20),
        leaf: color(60, 200, 40),
        fruit: color(220, 150, 50),
        variation: true,
        glowIntensity: 0.1
      },
      fern: {
        stem: color(70, 130, 40),
        leaf: color(30, 180, 90),
        fruit: color(70, 130, 40),
        variation: true,
        glowIntensity: 0.3
      },
      bush: {
        stem: color(60, 100, 30),
        leaf: color(80, 200, 80),
        fruit: color(255, 100, 100),
        variation: true,
        glowIntensity: 0.2
      },
      
      // Flower themes
      flower: {
        stem: color(100, 140, 40),
        leaf: color(100, 200, 50),
        fruit: color(255, 50, 100),
        variation: true,
        glowIntensity: 0.4
      },
      cherry: {
        stem: color(110, 60, 20),
        leaf: color(210, 230, 225),  // Light pink tinted leaves
        fruit: color(250, 80, 120),  // Bright pink cherries
        variation: true,
        glowIntensity: 0.5
      },
      
      // Desert theme
      cactus: {
        stem: color(50, 150, 50),
        leaf: color(150, 255, 150),
        fruit: color(255, 200, 50),  // Yellow flowers
        variation: true,
        glowIntensity: 0.2
      },
      
      // Forest themes
      thickbush: {
        stem: color(70, 90, 30),
        leaf: color(50, 180, 40),
        fruit: color(200, 50, 50),
        variation: true,
        glowIntensity: 0.1
      },
      berry: {
        stem: color(80, 50, 20),
        leaf: color(60, 180, 60),
        fruit: color(100, 50, 200),  // Purple berries
        variation: true,
        glowIntensity: 0.35
      },
      
      // Fantasy theme
      crystal: {
        stem: color(100, 180, 220),  // Blue-tinted crystal stems
        leaf: color(150, 230, 255),  // Shimmering blue leaves
        fruit: color(80, 200, 255),  // Glowing blue crystals
        variation: true,
        glowIntensity: 0.8
      }
    };
    
    // Generate the L-system
    this.generate();
  }

  
  
  // Generate L-system production string
  generate() {
    let result = this.axiom;
    
    // Apply production rules
    for (let i = 0; i < this.iterations; i++) {
      let nextGen = '';
      
      for (let j = 0; j < result.length; j++) {
        const current = result[j];
        if (this.rules[current]) {
          if (typeof this.rules[current] === 'function') {
            // For stochastic rules (functions)
            nextGen += this.rules[current]();
          } else if (Array.isArray(this.rules[current])) {
            // For weighted rules (arrays of [string, probability])
            const rand = random();
            let cumulativeProbability = 0;
            let applied = false;
            
            for (const [rule, probability] of this.rules[current]) {
              cumulativeProbability += probability;
              if (rand < cumulativeProbability) {
                nextGen += rule;
                applied = true;
                break;
              }
            }
            
            // Default if no rule was applied
            if (!applied) {
              nextGen += current;
            }
          } else {
            // Simple string replacement
            nextGen += this.rules[current];
          }
        } else {
          // Keep unchanged if no rule exists
          nextGen += current;
        }
      }
      
      result = nextGen;
      
      // Safety check for length
      if (result.length > 2000) {
        console.warn("L-system production too large, truncating");
        result = result.substring(0, 2000);
        break;
      }
    }
    
    this.production = result;
    return result;
  }
  
  // Process L-system to create segment data
  process() {
    const segments = [];
    const stack = [];
    
    // Track fruits
    const fruits = [];
    
    // Start at the bottom center
    let x = 0;
    let y = 0;
    let angle = -PI/2; // Start growing upward
    let thickness = 1.0; // Base thickness
    let color = this.stemColor;
    
    // Process each character in the production
    for (let i = 0; i < this.production.length; i++) {
      const char = this.production[i];
      
      switch (char) {
        case 'F': // Draw forward
        case 'G': // Alternative forward symbol
          const oldX = x;
          const oldY = y;
          x += cos(angle) * 10;
          y += sin(angle) * 10;
          
          segments.push({
            x1: oldX,
            y1: oldY,
            x2: x,
            y2: y,
            depth: stack.length,
            thickness: thickness,
            originalAngle: angle,
            color: color,
            isRoot: stack.length === 0 && oldY >= -1
          });
          break;
          
        case 'f': // Move without drawing
          x += cos(angle) * 10;
          y += sin(angle) * 10;
          break;
          
        case '+': // Turn right
          angle += this.angle * random(0.8, 3); // Add randomness
          break;
          
        case '-': // Turn left
          angle -= this.angle * random(0.8, 3); // Add randomness
          break;
          
        case '<': // Decrease angle increment
          this.angle *= 0.8;
          break;
          
        case '>': // Increase angle increment
          this.angle *= 1.25;
          break;
          
        case '[': // Push state
          stack.push({x, y, angle, thickness, color});
          // Reduce thickness for branches
          thickness *= 0.75;
          break;
          
        case ']': // Pop state
          if (stack.length > 0) {
            const state = stack.pop();
            x = state.x;
            y = state.y;
            angle = state.angle;
            thickness = state.thickness;
            color = state.color;
          }
          break;
          
        case '!': // Decrease thickness
          thickness *= 0.8;
          break;
          
        case '"': // Increase thickness
          thickness *= 1.2;
          break;
          
        case '*': // Add a fruit
          if (random() < this.fruitProbability) {
            fruits.push({
              x: x,
              y: y,
              size: random(5, 12),
              color: this.fruitColor,
              angle: angle // For orientation
            });
          }
          break;
          
        case 'c': // Change color to random variation
          if (this.colorVariation) {
            // Tint the color slightly
            const h = hue(this.stemColor);
            const s = saturation(this.stemColor);
            const b = brightness(this.stemColor);
            color = color(
              h + random(-20, 20), 
              constrain(s + random(-15, 15), 0, 100), 
              constrain(b + random(-15, 15), 0, 100)
            );
          }
          break;
      }
    }
    
    this.segments = segments;
    this.fruits = fruits;
    return segments;
  }
  
  // Create a simple plant
  static createSimplePlant() {
    return new LSystem({
      axiom: 'F',
      rules: {
        'F': 'FF+[+F]-[-F]+[+F]-[-F]'
      },
      angle: PI/6,
      iterations: 2,
      leafColor: color(100, 220, 50),
      stemColor: color(80, 120, 40)
    });
  }
  
  // Create a tree
  static createTree() {
    return new LSystem({
      axiom: 'F',
      rules: {
        'F': 'FF[+F][-F][+F]'
      },
      angle: PI/7,
      iterations: 3,
      leafColor: color(60, 200, 40),
      stemColor: color(100, 70, 20)
    });
  }
  
  // Create a fern
  static createFern() {
    return new LSystem({
      axiom: 'X',
      rules: {
        'X': 'F-[[X]+X]+F[+FX]-X',
        'F': 'FF'
      },
      angle: PI/8,
      iterations: 2,
      leafColor: color(70, 200, 40),
      stemColor: color(70, 130, 40)
    });
  }
  
  // Create a bush
  static createBush() {
    return new LSystem({
      axiom: 'F',
      rules: {
        'F': 'FF+[+F][-F]+[+F][-F]'
      },
      angle: PI/4,
      iterations: 3,
      leafColor: color(120, 210, 40),
      stemColor: color(60, 100, 30)
    });
  }
  
  // Create a flower plant
  static createFlower() {
    return new LSystem({
      axiom: 'X',
      rules: {
        'X': 'F[+X][-X]FX',
        'F': 'FFF'
      },
      angle: PI/5,
      iterations: 3,
      fruitProbability: 0.7,
      fruitColor: color(255, 50, 100),
      leafColor: color(100, 200, 50),
      stemColor: color(100, 140, 40),
      colorVariation: true
    });
  }
  
  // Create a cherry tree
  static createCherryTree() {
    return new LSystem({
      axiom: 'F',
      rules: {
        'F': 'FFF-[-F+F+F*]+[+F-F-F*]'
      },
      angle: PI,
      iterations: 2,
      fruitProbability: 0.4,
      fruitColor: color(220, 20, 60),
      leafColor: color(120, 180, 40),
      stemColor: color(80, 40, 20)
    });
  }
  
  // Create a cactus
  static createCactus() {
    return new LSystem({
      axiom: 'F',
      rules: {
        'F': '[+"F][-F][+F][-F]FF[+F][-F]FFF',
      },
      angle: PI/2,
      iterations: 2, 
      leafColor: color(50, 180, 50),
      stemColor: color(50, 150, 50)
    });
  }
  
  // Create a thick bush
  static createThickBush() {
    return new LSystem({
      axiom: 'F',
      rules: {
        'F': '[+"F]["F][+F]F[+"F]["F][+F][-F]F[+F][-F][+F][-F][+F][-F]FF'
      },
      angle: PI/6,
      iterations: 2,
      leafColor: color(200, 250, 30),
      stemColor: color(70, 90, 30)
    });
  }
  
  // Create a berry bush
  static createBerryBush() {
    return new LSystem({
      axiom: 'X',
      rules: {
        'X': 'F[-X][+X]FXFF*',
        'F': 'FF*'
      },
      angle: PI/4,
      iterations: 3,
      fruitProbability: 1.0,
      fruitColor: color(100, 50, 200),
      leafColor: color(60, 180, 60),
      stemColor: color(80, 50, 20)
    });
  }
  
  // Create a fantasy crystal plant
  static createCrystalPlant() {
    return new LSystem({
      axiom: 'X',
      rules: {
        'X': 'F[-X]*[+X]*FXF[-X]*[+X]',
        'F': 'F*F'
      },
      angle: PI/3,
      iterations: 2,
      fruitProbability: 0.9,
      fruitColor: color(80, 200, 255),
      leafColor: color(150, 230, 255),
      stemColor: color(100, 180, 220),
      colorVariation: true
    });
  }
  
  // Create a random plant
  static createRandomPlant() {
    // Create a plant with random parameters
    const types = [
      'simple', 'tree', 'fern', 'bush', 'flower', 
      'cherry', 'cactus', 'thickbush', 'berry', 'crystal'
    ];
    const type = types[Math.floor(random(types.length))];
    
    switch(type) {
      case 'tree': return LSystem.createTree();
      case 'fern': return LSystem.createFern();
      case 'bush': return LSystem.createBush();
      case 'flower': return LSystem.createFlower();
      case 'cherry': return LSystem.createCherryTree();
      case 'cactus': return LSystem.createCactus();
      case 'thickbush': return LSystem.createThickBush();
      case 'berry': return LSystem.createBerryBush();
      case 'crystal': return LSystem.createCrystalPlant();
      default: return LSystem.createSimplePlant();
    }
  }
}