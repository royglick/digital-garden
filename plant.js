// plant.js - Enhanced plant implementation with Matter.js physics - FIXED GROWTH

class ToxicPlant {
  constructor(x, y, type = 'random') {
    // Position (at bottom of screen)
    this.x = x;
    this.y = y;
    
    // Growth properties
    this.growth = 0;
    this.targetGrowth = 1;
    this.growthRate = 0.03; // Slower growth rate (was 0.005)
    
    // Default visual properties
    this.stemThickness = 4;
    
    // Create L-system based on type
    switch(type) {
      case 'tree':
        this.lsystem = LSystem.createTree();
        this.stemThickness = 5;
        break;
      case 'fern':
        this.lsystem = LSystem.createFern();
        this.stemThickness = 3;
        break;
      case 'bush':
        this.lsystem = LSystem.createBush();
        this.stemThickness = 4;
        break;
      case 'flower':
        this.lsystem = LSystem.createFlower();
        this.stemThickness = 3;
        break;
      case 'cherry':
        this.lsystem = LSystem.createCherryTree();
        this.stemThickness = 4;
        break;
      case 'cactus':
        this.lsystem = LSystem.createCactus();
        this.stemThickness = 8;
        break;
      case 'thickbush':
        this.lsystem = LSystem.createThickBush();
        this.stemThickness = 5;
        break;
      case 'berry':
        this.lsystem = LSystem.createBerryBush();
        this.stemThickness = 3;
        break;
      case 'crystal':
        this.lsystem = LSystem.createCrystalPlant();
        this.stemThickness = 3;
        break;
      case 'random':
        this.lsystem = LSystem.createRandomPlant();
        this.stemThickness = random(3, 5);
        break;
      default:
        this.lsystem = LSystem.createSimplePlant();
    }
    
    // Get colors from the L-system
    this.stemColor = this.lsystem.stemColor;
    this.leafColor = this.lsystem.leafColor;
    this.fruitColor = this.lsystem.fruitColor;
    
    // Process L-system to get segments
    this.segments = this.lsystem.process();
    this.fruits = this.lsystem.fruits || [];
    
    // Scale factor for overall size (reduced for stability)
    this.scaleFactor = random(0.6, 1.8); // Was 0.8-3.0
    
    // Physics structure - Now using MatterPhysics
    this.physics = new MatterPhysics();
    this.particleMap = new Map();  // Maps segment endpoints to particles
    this.segmentToSpring = new Map(); // Maps segments to springs
    this.fruitParticles = []; // Stores fruit particles
    
    // Growth state management
    this.lastSegmentIndex = 0;
    this.totalSegments = this.segments.length;
    this.growingPhase = true;
    
    // Set up initial physics structure (now done gradually)
    this.setupInitialRoot();
  }
  
  // Set up just the root structure initially
  setupInitialRoot() {
    // Find root segments (first few segments)
    const rootSegments = this.segments.filter(segment => segment.depth === 0)
                                     .slice(0, 3); // Just take first 3 root segments
    
    // Set up physics for these root segments
    for (const segment of rootSegments) {
      this.setupSegmentPhysics(segment);
    }
    
    this.lastSegmentIndex = rootSegments.length;
  }
  
  // Set up physics for a specific segment
  setupSegmentPhysics(segment) {
    // Transform coordinates to world space
    const x1 = this.x + segment.x1 * this.scaleFactor;
    const y1 = this.y + segment.y1 * this.scaleFactor;
    const x2 = this.x + segment.x2 * this.scaleFactor;
    const y2 = this.y + segment.y2 * this.scaleFactor;
    
    // Create key for start point
    const startKey = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
    
    // Create or reuse particle for start point
    let startParticle;
    if (this.particleMap.has(startKey)) {
      startParticle = this.particleMap.get(startKey);
    } else {
      // Calculate mass based on depth and thickness
      const thicknessFactor = segment.thickness || 1.0;
      const mass = map(segment.depth, 0, 10, 2, 0.2) * thicknessFactor; // Reduced masses
      
      // Root segments are fixed
      const isRoot = segment.isRoot;
      
      // Create particle
      startParticle = this.physics.createParticle(x1, y1, mass, isRoot);
      this.particleMap.set(startKey, startParticle);
    }
    
    // Create key for end point
    const endKey = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
    
    // Create or reuse particle for end point
    let endParticle;
    if (this.particleMap.has(endKey)) {
      endParticle = this.particleMap.get(endKey);
    } else {
      // Calculate mass based on depth and thickness
      const thicknessFactor = segment.thickness || 1.0;
      const mass = map(segment.depth, 0, 10, 0.5, 0.05) * thicknessFactor; // Reduced masses
      
      // Create particle (end points are never fixed)
      endParticle = this.physics.createParticle(x2, y2, mass, false);
      this.particleMap.set(endKey, endParticle);
    }
    
    // Create spring between particles with strength based on thickness
    const thicknessFactor = segment.thickness || 1.0;
    const springStrength = map(segment.depth, 0, 10, 0.05, 0.01) * thicknessFactor; // Reduced strengths
    
    const spring = this.physics.createSpring(
      startParticle, 
      endParticle, 
      springStrength
    );
    
    // Store spring reference with segment information
    if (spring) {
      spring.segmentColor = segment.color || this.stemColor;
      spring.segmentThickness = segment.thickness || 1.0;
      spring.depth = segment.depth;
      this.segmentToSpring.set(segment, spring);
    }
  }
  
  // Gradually add segments as plant grows
  growPlant() {
    if (this.lastSegmentIndex >= this.segments.length) {
      this.growingPhase = false;
      return; // All segments are already added
    }
    
    // Add a few segments at a time as plant grows
    const segmentsToAddPerFrame = Math.max(1, Math.floor(this.segments.length / 50));
    const endIndex = Math.min(this.lastSegmentIndex + segmentsToAddPerFrame, this.segments.length);
    
    for (let i = this.lastSegmentIndex; i < endIndex; i++) {
      const segment = this.segments[i];
      this.setupSegmentPhysics(segment);
    }
    
    this.lastSegmentIndex = endIndex;
    
    // Add angle constraints only when most segments are added
    if (this.lastSegmentIndex >= this.segments.length * 0.8 && !this.constraintsAdded) {
      this.addAngleConstraints();
      this.constraintsAdded = true;
    }
    
    // Add fruits only at the end
    if (this.lastSegmentIndex >= this.segments.length && this.fruits.length > 0 && !this.fruitsAdded) {
      this.addFruits();
      this.fruitsAdded = true;
    }
  }
  
  // Add fruits to the plant
  addFruits() {
    if (!this.fruits || this.fruits.length === 0) return;
    
    for (const fruit of this.fruits) {
      // Transform to world space
      const x = this.x + fruit.x * this.scaleFactor;
      const y = this.y + fruit.y * this.scaleFactor;
      
      // Find nearest particle to attach fruit to
      let nearestParticle = null;
      let minDistance = Infinity;
      
      for (const [key, particle] of this.particleMap) {
        const distance = dist(x, y, particle.position.x, particle.position.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestParticle = particle;
        }
      }
      
      if (nearestParticle) {
        // Create fruit particle
        const fruitParticle = this.physics.createParticle(x, y, 0.3, false); // Reduced mass
        
        // Create spring to attach fruit to nearest stem
        const spring = this.physics.createSpring(
          nearestParticle,
          fruitParticle,
          0.005, // Weaker spring for dangling effect
          fruit.size * 1.2 // Rest length for fruit to dangle
        );
        
        // Store fruit info with particle
        if (fruitParticle) {
          fruitParticle.fruitInfo = {
            size: fruit.size * this.scaleFactor,
            color: fruit.color
          };
          
          this.fruitParticles.push(fruitParticle);
        }
      }
    }
  }
  
  // Add angle constraints to maintain branching structure
  addAngleConstraints() {
    // Find segments that share start points
    const startPointMap = new Map(); // Maps start point to an array of segments
    
    for (const segment of this.segments) {
      const startKey = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
      
      if (!startPointMap.has(startKey)) {
        startPointMap.set(startKey, []);
      }
      
      startPointMap.get(startKey).push(segment);
    }
    
    // For each point with multiple segments, add angle constraints
    for (const [startKey, segments] of startPointMap.entries()) {
      if (segments.length >= 2) {
        // Get the common particle
        const commonParticle = this.particleMap.get(startKey);
        
        // Add constraints between pairs of segments
        for (let i = 0; i < segments.length; i++) {
          for (let j = i + 1; j < segments.length; j++) {
            const segmentA = segments[i];
            const segmentB = segments[j];
            
            // Get end particles
            const endParticleA = this.particleMap.get(`${segmentA.x2.toFixed(2)},${segmentA.y2.toFixed(2)}`);
            const endParticleB = this.particleMap.get(`${segmentB.x2.toFixed(2)},${segmentB.y2.toFixed(2)}`);
            
            if (!endParticleA || !endParticleB) continue;
            
            // Calculate original angle between segments
            const angleA = segmentA.originalAngle;
            const angleB = segmentB.originalAngle;
            const originalAngle = Math.abs(angleA - angleB);
            
            // Add constraint to maintain angle
            const strength = map(segmentA.depth, 0, 10, 0.01, 0.002); // Reduced strengths
            try {
              this.physics.createAngleConstraint(
                endParticleA,
                commonParticle,
                endParticleB,
                originalAngle,
                strength
              );
            } catch (e) {
              console.log("Error creating angle constraint:", e);
            }
          }
        }
      }
    }
  }
  
  // Update plant growth and physics
  update() {
    // Update growth
    if (this.growth < this.targetGrowth) {
      this.growth += this.growthRate;
      if (this.growth > this.targetGrowth) {
        this.growth = this.targetGrowth;
      }
    }
    
    // Gradually add plant segments as it grows
    if (this.growingPhase && this.growth > 0.1) {
      // Map growth progress to segment addition
      const growthRatio = this.growth / this.targetGrowth;
      const targetSegments = Math.floor(growthRatio * this.totalSegments);
      
      if (this.lastSegmentIndex < targetSegments) {
        this.growPlant();
      }
    }
    
    // Update physics
    this.physics.update();
  }
  
  // Draw the plant
  draw() {
    // Sort springs by depth for proper rendering (deeper segments rendered on top)
    const sortedSprings = [...this.segmentToSpring.values()].sort((a, b) => {
      return (a.depth || 0) - (b.depth || 0);
    });
    
    // Draw each segment
    for (const spring of sortedSprings) {
      // Skip invalid springs
      if (!spring || !spring.a || !spring.b || 
          !spring.a.position || !spring.b.position) continue;
          
      // Calculate segment's growth progress based on index
      const springIndex = sortedSprings.indexOf(spring);
      const segmentIndex = springIndex / sortedSprings.length;
      const growthThreshold = segmentIndex / this.growth;
      
      // Skip segments that haven't grown yet
      if (growthThreshold > 1) continue;
      
      // Calculate segment growth percentage
      let segmentGrowth = 1;
      if (growthThreshold > 0.9) {
        segmentGrowth = map(growthThreshold, 0.9, 1, 1, 0);
      }
      
      // Determine color and thickness
      const segmentColor = spring.segmentColor || this.stemColor;
      const baseThickness = this.stemThickness * (spring.segmentThickness || 1.0);
      const depthFactor = map(spring.depth || 0, 0, 5, 1, 0.3);
      
      // Calculate thickness with growth
      const thickness = baseThickness * depthFactor * segmentGrowth;
      
      // Draw the segment
      strokeWeight(thickness);
      stroke(segmentColor);
      
      // Draw fully grown segment between current particle positions
      if (segmentGrowth === 1) {
        line(spring.a.position.x, spring.a.position.y, spring.b.position.x, spring.b.position.y);
        
        // Draw leaf at branch tips if identified as end segment (depth >= 2)
        if ((spring.depth >= 2) && this.isEndSpring(spring) && this.growth > 0.8) {
          this.drawLeaf(spring.b, spring.a);
        }
      } else {
        // For partially grown segments, interpolate
        const t = segmentGrowth;
        const x2 = spring.a.position.x + (spring.b.position.x - spring.a.position.x) * t;
        const y2 = spring.a.position.y + (spring.b.position.y - spring.a.position.y) * t;
        line(spring.a.position.x, spring.a.position.y, x2, y2);
      }
    }
    
    // Draw fruits with full growth
    if (this.growth > 0.7) {
      // Calculate fruit growth factor
      const fruitGrowth = map(this.growth, 0.7, 1, 0, 1);
      
      for (const fruitParticle of this.fruitParticles) {
        if (fruitParticle && fruitParticle.fruitInfo && fruitParticle.position) {
          push();
          noStroke();
          fill(fruitParticle.fruitInfo.color);
          
          // Draw fruit with size based on growth
          const size = fruitParticle.fruitInfo.size * fruitGrowth;
          ellipse(fruitParticle.position.x, fruitParticle.position.y, size, size);
          
          // Add highlight
          fill(255, 255, 255, 100);
          ellipse(
            fruitParticle.position.x + size * 0.2, 
            fruitParticle.position.y - size * 0.2, 
            size * 0.3, 
            size * 0.3
          );
          pop();
        }
      }
    }
  }
  
  // Check if a spring is connected to an end point
  isEndSpring(spring) {
    // Check if spring.b is not the start of any other spring
    for (const otherSpring of this.segmentToSpring.values()) {
      if (otherSpring === spring) continue;
      
      // Safety check for position values
      if (!spring.b || !spring.b.position || !otherSpring.a || !otherSpring.a.position) continue;
      
      // Check if springs share this point (within small tolerance)
      if (dist(spring.b.position.x, spring.b.position.y, 
               otherSpring.a.position.x, otherSpring.a.position.y) < 1) {
        return false;
      }
    }
    return true;
  }
  
  // Draw a leaf at a branch tip
  drawLeaf(tipParticle, parentParticle) {
    if (!tipParticle || !tipParticle.position || !parentParticle || !parentParticle.position) return;
    
    push();
    
    // Calculate leaf direction based on branch direction
    const dx = tipParticle.position.x - parentParticle.position.x;
    const dy = tipParticle.position.y - parentParticle.position.y;
    const angle = Math.atan2(dy, dx);
    
    noStroke();
    fill(this.leafColor);
    
    // Draw leaf shape
    beginShape();
    vertex(tipParticle.position.x, tipParticle.position.y);
    vertex(
      tipParticle.position.x + cos(angle + PI/4) * 8,
      tipParticle.position.y + sin(angle + PI/4) * 8
    );
    vertex(
      tipParticle.position.x + cos(angle) * 18,
      tipParticle.position.y + sin(angle) * 18
    );
    vertex(
      tipParticle.position.x + cos(angle - PI/4) * 8,
      tipParticle.position.y + sin(angle - PI/4) * 8
    );
    endShape(CLOSE);
    
    pop();
  }
  
  // Draw physics debug visualization
  drawDebug() {
    this.physics.drawDebug();
  }
  
  // Clean up plant resources
  destroy() {
    this.physics.clear();
  }
}