// physics.js - Physics system using Matter.js with world boundaries

class MatterPhysics {
  constructor() {
    // Create Matter.js engine with improved settings
    this.engine = Matter.Engine.create({
      // Disable automatic collision detection until we need it
      enableSleeping: true,
      constraintIterations: 2,
      // Reduce precision for better performance
      positionIterations: 6,
      velocityIterations: 4
    });
    this.world = this.engine.world;
    
    // Configure gravity (lighter than default and pointing downward)
    this.world.gravity.y = -0.95;
    
    // Collections to track our objects
    this.bodies = [];
    this.springs = [];
    this.constraints = [];
    this.fixedBodies = new Set();
    
    // Physics parameters (reduced strength for stability)
    this.springStiffness = 0.005; // Reduced from 0.01
    this.springDamping = 0.03;
    this.constraintStiffness = 0.15;
    
    // Create a composite for better organization
    this.composite = Matter.Composite.create({ label: 'Plant Physics' });
    Matter.World.add(this.world, this.composite);
    
    // Create world boundaries
    this.createWorldBoundaries();
  }
  
  // Create boundaries to keep objects on screen
  createWorldBoundaries() {
    // Floor
    const floor = Matter.Bodies.rectangle(width / 2, height + 50, width * 2, 100, {
      isStatic: true,
      render: { fillStyle: 'transparent' },
      label: 'floor'
    });
    
    // Left wall
    const leftWall = Matter.Bodies.rectangle(-50, height / 2, 100, height * 2, {
      isStatic: true,
      render: { fillStyle: 'transparent' },
      label: 'leftWall'
    });
    
    // Right wall
    const rightWall = Matter.Bodies.rectangle(width + 50, height / 2, 100, height * 2, {
      isStatic: true,
      render: { fillStyle: 'transparent' },
      label: 'rightWall'
    });
    
    // Add boundaries to world
    Matter.World.add(this.world, [floor, leftWall, rightWall]);
  }
  
  // Update physics simulation
  update() {
    // Run the Matter.js engine update with fixed timestep
    // This can help prevent physics instability
    Matter.Engine.update(this.engine, 1000 / 60);
  }
  
  // Create a particle for physics simulation
  createParticle(x, y, mass = 0.02, isFixed = false) {
    // Scale mass to work with Matter.js (which uses different units)
    // Reduce mass for more stable behavior
    const matterMass = mass * 50; // Reduced from 100
    
    // Create a small circle body for the particle
    const radius = Math.max(2, mass * 15); // Reduced size
    const body = Matter.Bodies.circle(x, y, radius, {
      mass: matterMass,
      frictionAir: 0.009, // Increased air friction for stability
      restitution: 0.02, // Lower restitution (bounciness)
      collisionFilter: {
        category: 0x0001,
        mask: 0x0002, // Only collide with hand objects
        group: 0 // 0 means normal collision behavior
      },
      render: {
        visible: false
      }
    });
    
    // Add to composite instead of directly to world for better management
    Matter.Composite.add(this.composite, body);
    this.bodies.push(body);
    
    // Fix the body if needed
    if (isFixed) {
      this.fixParticle(body);
    }
    
    return body;
  }
  
  // Create a spring between two particles
  createSpring(particleA, particleB, strength = this.springStiffness, restLength = -1) {
    // Safety check for valid particles
    if (!particleA || !particleB) {
      console.warn("Attempted to create spring with invalid particles");
      return null;
    }
    
    // Calculate default rest length if not specified
    if (restLength < 0) {
      const dx = particleA.position.x - particleB.position.x;
      const dy = particleA.position.y - particleB.position.y;
      restLength = Math.sqrt(dx * dx + dy * dy);
    }
    
    // Convert strength to Matter.js stiffness (different scale)
    // Lower stiffness for more stability
    const stiffness = strength * 5; // Reduced from 100
    
    // Create constraint (spring)
    const constraint = Matter.Constraint.create({
      bodyA: particleA,
      bodyB: particleB,
      length: restLength,
      stiffness: stiffness,
      damping: this.springDamping,
      render: {
        visible: false
      }
    });
    
    // Add to composite
    Matter.Composite.add(this.composite, constraint);
    this.springs.push(constraint);
    
    // Store reference to the particles for drawing
    constraint.a = particleA;
    constraint.b = particleB;
    
    return constraint;
  }
  
  // Create an angle constraint between three bodies
  createAngleConstraint(particleA, particleB, particleC, targetAngle, strength = this.constraintStiffness) {
    // Safety checks for valid particles
    if (!particleA || !particleB || !particleC) {
      console.warn("Attempted to create angle constraint with invalid particles");
      return null;
    }
    
    try {
      // Calculate current positions
      const vecAB = {
        x: particleB.position.x - particleA.position.x,
        y: particleB.position.y - particleA.position.y
      };
      const vecBC = {
        x: particleC.position.x - particleB.position.x,
        y: particleC.position.y - particleB.position.y
      };
      
      // Calculate lengths
      const lenAB = Math.sqrt(vecAB.x * vecAB.x + vecAB.y * vecAB.y);
      const lenBC = Math.sqrt(vecBC.x * vecBC.x + vecBC.y * vecBC.y);
      
      // Ensure we have valid lengths to avoid Math errors
      if (lenAB === 0 || lenBC === 0) {
        return null;
      }
      
      // Calculate rest length using law of cosines
      // c² = a² + b² - 2ab*cos(C)
      const restLength = Math.sqrt(
        lenAB * lenAB + lenBC * lenBC - 
        2 * lenAB * lenBC * Math.cos(targetAngle)
      );
      
      // Create a spring with specified strength to maintain the angle approximately
      // Lower strength for more stability
      return this.createSpring(particleA, particleC, strength * 0.05, restLength);
    } catch (e) {
      console.error("Error creating angle constraint:", e);
      return null;
    }
  }
  
  // Fix a particle in place
  fixParticle(particle) {
    // Set the body as static
    Matter.Body.setStatic(particle, true);
    this.fixedBodies.add(particle);
    
    // Store original position
    particle.originalX = particle.position.x;
    particle.originalY = particle.position.y;
  }
  
  // Clear all physics objects
  clear() {
    // Use Matter.js composite removal for efficient cleanup
    Matter.World.remove(this.world, this.composite);
    
    // Create a new composite
    this.composite = Matter.Composite.create({ label: 'Plant Physics' });
    Matter.World.add(this.world, this.composite);
    
    // Clear our tracking arrays
    this.springs = [];
    this.bodies = [];
    this.fixedBodies.clear();
  }
  
  // Draw debug visualization
  drawDebug() {
    push();
    
    // Draw springs
    stroke(100, 200, 255, 100);
    strokeWeight(1);
    for (const spring of this.springs) {
      if (spring.a && spring.b && spring.a.position && spring.b.position) {
        line(spring.a.position.x, spring.a.position.y, 
             spring.b.position.x, spring.b.position.y);
      }
    }
    
    // Draw particles
    noStroke();
    for (const body of this.bodies) {
      if (body && body.position) {
        if (this.fixedBodies.has(body)) {
          fill(255, 100, 100, 150);
          ellipse(body.position.x, body.position.y, 6, 6);
        } else {
          fill(255, 255, 100, 100);
          ellipse(body.position.x, body.position.y, 4, 4);
        }
      }
    }
    
    // Draw world boundaries in debug mode
    stroke(255, 0, 0, 100);
    strokeWeight(2);
    line(0, height, width, height); // Floor
    line(0, 0, 0, height); // Left wall
    line(width, 0, width, height); // Right wall
    
    pop();
  }
}

// For backward compatibility, creating a class with the same name
class ToxiPhysics extends MatterPhysics {
  constructor() {
    super();
  }
}