let garden;
let showDebug = false;
let video; // Video capture for hand detection
let hands = [];
let handPose;
let handAttractors; // Hand attraction system
let handGestures; // Hand gesture detection
let handVisualizer; // Hand visualization with floating chains
let lastFrameTime = 0;
let frameInterval = 1000 / 30; // Target 30fps
let showHandChains = true; // Toggle for hand chain visualization
let atmosphere;

// Button states to track hovering and prevent multiple triggers
let resetButton = {
  x: 0, // Will be set in setup based on window width
  y: 50,
  radius: 30,
  isHovered: false,
  lastTriggerTime: 0,
  cooldown: 500 // ms between triggers
};

let chainsButton = {
  x: 0, // Will be set in setup based on window width
  y: 50,
  radius: 30,
  isHovered: false,
  lastTriggerTime: 0,
  cooldown: 500 // ms between triggers
};

let windEffect = {
  active: true,
  force: 0,
  targetForce: 0,
  changeRate: 0.93,
  maxForce: 0.00025
};

function updateWindEffect() {
  // Only update wind if active
  if (!windEffect.active) return;
  
  // Gradually change the current force toward the target
  windEffect.force = lerp(windEffect.force, windEffect.targetForce, 0.01);
  
  // Occasionally change wind target
  if (random() < 0.5) {
    // Set a new target force (positive is right, negative is left)
    windEffect.targetForce = random(-windEffect.maxForce, windEffect.maxForce);
  }
  
  // Apply the wind force to all non-fixed bodies in the garden
  for (const plant of garden.plants) {
    // Skip if plant doesn't have physics
    if (!plant.physics || !plant.physics.bodies) continue;
    
    // Apply to each body in the plant
    for (const body of plant.physics.bodies) {
      // Don't apply wind to fixed/static bodies (like roots)
      if (body.isStatic) continue;
      
      // Apply stronger force to bodies higher up in the plant (more exposed to wind)
      // and to smaller/lighter bodies (leaves and tips)
      const heightFactor = map(body.position.y, height, 0, 0.5, 2.0);
      const massFactor = map(body.mass, 0.1, 2, 1.5, 0.5);
      
      // Create some vertical variation based on horizontal position
      const verticalFactor = sin(body.position.x * 0.01 + frameCount * 0.01) * 0.2;
      
      // Apply the horizontal wind force
      Matter.Body.applyForce(body, body.position, {
        x: windEffect.force * heightFactor * massFactor,
        y: windEffect.force * verticalFactor * heightFactor * massFactor
      });
    }
  }
}

// Preload function to load ml5 handpose model first
function preload() {
  // Load handPose model
  handPose = ml5.handPose();
  console.log("HandPose model preloaded");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize video capture for hand detection
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide();
  // video.style('transform', 'scaleX(-1)');
  
  // Start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);

  // Set button positions
  resetButton.x = windowWidth - 120;
  chainsButton.x = windowWidth - 190;
  
  // Initialize garden
  garden = new EnhancedGarden();
  
  // Initialize hand attractors (replacing physics)
  handAttractors = new HandAttractors(garden);

  // Initialize atmospheric effects
  atmosphere = new Atmosphere();

  
  // Initialize hand gesture detection
  handGestures = new HandGestures();
  
  // Initialize hand visualizer with floating chains
  handVisualizer = new HandVisualizer();
  
  // Dark background
  background(10, 20, 30);
  
  // Add mouse and keyboard handlers
  canvas.addEventListener('mousedown', handleMousePressed);
  document.addEventListener('keydown', handleKeyPress);
  
  // Create initial plants
  setTimeout(() => {
    for (let i = 0; i < 2; i++) {
      const x = width * (0.33 + i * 0.33);
      garden.createPlant(x, height - 10);
    }
  }, 1000);  
  
  // Disable loop and use our own timing
  // This helps prevent physics instability
  noLoop();
  
  // Start animation frame loop
  requestAnimationFrame(animationLoop);
}

function animationLoop(timestamp) {
  // Calculate elapsed time
  const elapsed = timestamp - lastFrameTime;
  
  // Only update at our target framerate
  if (elapsed > frameInterval) {
    lastFrameTime = timestamp - (elapsed % frameInterval);
    draw();
  }
  
  // Request next frame
  requestAnimationFrame(animationLoop);
}

function draw() {
  // Error handling for the entire draw cycle
  try {
    // Clear background
    background(10, 20, 30);

    // Update and draw atmosphere
    atmosphere.update();
    atmosphere.draw();
    // atmosphere.drawDustDebug();
    
    // Update garden with error handling
    try {
      garden.update();
      // Update wind effect (add this line)
      updateWindEffect();
    } catch (e) {
      console.error("Error updating garden:", e);
    }
    
    // Update hand attractors with error handling
    try {
      if (hands.length > 0) {
        handAttractors.update(hands);
        // Update button hover states with hand position
        updateButtonStates(hands[0]);
        // Add dust around hand when it moves quickly
        // if (hands[0].wrist) {
        //   const wrist = hands[0].wrist;
        //   if (handVisualizer.lastHandPosition) {
        //     const moveDistance = dist(wrist.x, wrist.y, 
        //                               handVisualizer.lastHandPosition.x, 
        //                               handVisualizer.lastHandPosition.y);
        //     // Emit dust particles when hand moves quickly
        //     if (moveDistance > 15) {
        //       atmosphere.addLocalEffect(wrist.x, wrist.y, 'dust', Math.floor(moveDistance / 10));
        //     }
        //   }
        // }
      }
    } catch (e) {
      console.error("Error updating hand attractors:", e);
    }
    
    // Update hand gestures with error handling
    try {
      if (hands.length > 0) {
        const gestures = handGestures.update(hands[0]);
        handleGestures(gestures);
      } else {
        handGestures.update(null);
      }
    } catch (e) {
      console.error("Error updating hand gestures:", e);
    }
    
    // Draw garden
    garden.draw();
    
    // Draw UI buttons
    drawUIButtons();
    
    // Draw hand visualization
    drawHandVisualization();
    
    // Draw pinch indicator if pinching
    if (handAttractors.isPinching) {
      drawPinchIndicator(handAttractors.pinchPosition);
      atmosphere.addLocalEffect(handAttractors.pinchPosition.x, handAttractors.pinchPosition.y, 'dust');
      console.log("Pinch detected at: ", handAttractors.pinchPosition);
    }
    
    // Display debug info if enabled
    if (showDebug) {
      try {
        garden.drawDebug();
        handAttractors.drawDebug();
        handGestures.drawDebug();
        displayDebugInfo();
      } catch (e) {
        console.error("Error in debug visualization:", e);
      }
    }
  } catch (e) {
    console.error("Critical error in draw cycle:", e);
  }
}

// Update button hover states and trigger actions when index finger touches them
function updateButtonStates(hand) {
  if (!hand || !hand.index_finger_tip) return;
  
  const indexTip = hand.index_finger_tip;
  
  // Check Reset button
  const resetDist = dist(indexTip.x, indexTip.y, resetButton.x, resetButton.y);
  resetButton.isHovered = resetDist < resetButton.radius;
  
  // Trigger reset button if hovering
  if (resetButton.isHovered) {
    const now = Date.now();
    if (now - resetButton.lastTriggerTime > resetButton.cooldown) {
      garden.clearPlants();
      resetButton.lastTriggerTime = now;
      console.log("Reset button triggered by hand");
    }
  }
  
  // Check Chains button
  const chainsDist = dist(indexTip.x, indexTip.y, chainsButton.x, chainsButton.y);
  chainsButton.isHovered = chainsDist < chainsButton.radius;
  
  // Trigger chains button if hovering
  if (chainsButton.isHovered) {
    const now = Date.now();
    if (now - chainsButton.lastTriggerTime > chainsButton.cooldown) {
      showHandChains = !showHandChains;
      chainsButton.lastTriggerTime = now;
      console.log("Chains button triggered by hand: " + (showHandChains ? "ON" : "OFF"));
    }
  }
}

// Draw all UI buttons
function drawUIButtons() {
  // Draw theme button
  handAttractors.drawThemeButton();
  
  // Draw reset plants button
  drawResetButton();
  
  // Draw toggle chains button
  drawToggleChainsButton();
}

// Draw the reset plants button
function drawResetButton() {
  push();
  
  // Draw button background with hover effect
  if (resetButton.isHovered) {
    fill(230, 80, 80, 200); // Brighter when hovered
  } else {
    fill(200, 80, 80, 150);
  }
  stroke(255, 255, 255, 150);
  strokeWeight(2);
  ellipse(resetButton.x, resetButton.y, resetButton.radius * 2);
  
  // Draw icon (X symbol)
  stroke(255);
  strokeWeight(3);
  line(resetButton.x - 10, resetButton.y - 10, resetButton.x + 10, resetButton.y + 10);
  line(resetButton.x + 10, resetButton.y - 10, resetButton.x - 10, resetButton.y + 10);
  
  // Draw text
  noStroke();
  fill(255, 255, 255, 200);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("RESET", resetButton.x, resetButton.y + resetButton.radius + 15);
  
  pop();
}

// Draw the toggle chains button
function drawToggleChainsButton() {
  push();
  
  // Draw button background with hover effect
  if (showHandChains) {
    fill(chainsButton.isHovered ? (120, 220, 120, 200) : (100, 200, 100, 150));
  } else {
    fill(chainsButton.isHovered ? [170, 170, 170, 200] : [150, 150, 150, 150]);
  }
  stroke(255, 255, 255, 150);
  strokeWeight(2);
  ellipse(chainsButton.x, chainsButton.y, chainsButton.radius * 2);
  
  // Draw icon (chain symbol)
  stroke(255);
  strokeWeight(2);
  noFill();
  // Draw three chain links
  for (let i = -1; i <= 1; i++) {
    ellipse(chainsButton.x + i * 7, chainsButton.y, 8, 12);
  }
  
  // Draw text
  noStroke();
  fill(255, 255, 255, 200);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("CHAINS", chainsButton.x, chainsButton.y + chainsButton.radius + 15);
  
  pop();
}

function drawPinchIndicator(position) {
  // Draw a visual indicator for active pinch
  push();
  noFill();
  strokeWeight(3);
  stroke(0, 255, 255, 150);
  ellipse(position.x, position.y, 25);
  
  // Draw attraction radius
  stroke(0, 255, 255, 50);
  strokeWeight(1);
  ellipse(position.x, position.y, handAttractors.attractionRadius * 2);
  pop();
}

function drawHandVisualization() {
  // Error handling wrapper
  try {
    // Update the enhanced hand visualization
    if (hands.length > 0) {
      handVisualizer.update(hands[0]);
    } else {
      handVisualizer.update(null);
    }
    
    // Draw the hand visualization
    if (showHandChains) {
      handVisualizer.draw(true); // Draw with chains
    } else {
      handVisualizer.draw(false); // Draw without chains
    }
    
    // Only draw the debug skeleton in debug mode
    if (showDebug) {
      drawHandDebug();
    }
  } catch (e) {
    console.error("Error in hand visualization:", e);
  }
}

// Draw the debug view of hand tracking
function drawHandDebug() {
  // Draw the original hand tracking for debugging
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    if (!hand || !hand.keypoints) continue;
    
    const connections = handPose.getConnections();
    if (!connections) continue;
    
    // Draw connections
    stroke(255, 100, 100);
    strokeWeight(1);
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      
      if (!hand.keypoints[pointAIndex] || !hand.keypoints[pointBIndex]) continue;
      
      let pointA = hand.keypoints[pointAIndex];
      let pointB = hand.keypoints[pointBIndex];
      line(pointA.x, pointA.y, pointB.x, pointB.y);
    }
    
    // Draw keypoints
    fill(0, 255, 0);
    noStroke();
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      if (!keypoint) continue;
      
      circle(keypoint.x, keypoint.y, 5);
      
      // Label indices in debug mode
      if (showDebug) {
        fill(255);
        textSize(8);
        text(j, keypoint.x + 5, keypoint.y + 5);
      }
    }
  }
}

function handleMousePressed(event) {
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  
  // Check for button clicks
  
  // Theme button
  const themeButton = handAttractors.themeButton;
  const themeDist = Math.hypot(mouseX - themeButton.x, mouseY - themeButton.y);
  if (themeDist < themeButton.radius) {
    garden.cycleTheme();
    return;
  }
  
  // Reset button
  const resetDist = Math.hypot(mouseX - resetButton.x, mouseY - resetButton.y);
  if (resetDist < resetButton.radius) {
    garden.clearPlants();
    return;
  }
  
  // Toggle chains button
  const chainsDist = Math.hypot(mouseX - chainsButton.x, mouseY - chainsButton.y);
  if (chainsDist < chainsButton.radius) {
    showHandChains = !showHandChains;
    return;
  }
  
  // Only create plants when clicking in lower half of screen
  if (mouseY > height * 0.5) {
    garden.createPlant(mouseX, height - 10);
    // Add dust effect where plant was created
    atmosphere.addLocalEffect(mouseX, height - 10, 'dust', 8);
  }
}

function handleKeyPress(event) {
  // Toggle debug view with 'd' key
  if (event.key === 'd' || event.key === 'D') {
    showDebug = !showDebug;
  }
  
  // Clear all plants with 'c' key
  if (event.key === 'c' || event.key === 'C') {
    garden.clearPlants();
  }
  
  // Add multiple random plants with 'r' key
  if (event.key === 'r' || event.key === 'R') {
    garden.createMultiplePlants(3);
  }
  
  // Toggle hand attractors with 'h' key
  if (event.key === 'h' || event.key === 'H') {
    const isEnabled = handAttractors.toggle();
    console.log(`Hand attraction ${isEnabled ? 'enabled' : 'disabled'}`);
  }
  
  // Performance mode with 'p' key
  if (event.key === 'p' || event.key === 'P') {
    frameInterval = frameInterval === 1000/30 ? 1000/15 : 1000/30;
    console.log(`Performance mode: ${frameInterval === 1000/15 ? 'ON (15fps)' : 'OFF (30fps)'}`);
  }
  
  // Cycle theme with 't' key
  if (event.key === 't' || event.key === 'T') {
    const newTheme = garden.cycleTheme();
    console.log(`Theme changed to: ${newTheme}`);
  }
  
  // Toggle chains with 'g' key
  if (event.key === 'g' || event.key === 'G') {
    showHandChains = !showHandChains;
    console.log(`Hand chains ${showHandChains ? 'enabled' : 'disabled'}`);
  }
  
  // Increase attraction strength with '+' key
  if (event.key === '+' || event.key === '=') {
    const newStrength = handAttractors.setStrength(handAttractors.attractionStrength * 1.2);
    console.log(`Attraction strength: ${newStrength.toFixed(4)}`);
  }
  
  // Decrease attraction strength with '-' key
  if (event.key === '-' || event.key === '_') {
    const newStrength = handAttractors.setStrength(handAttractors.attractionStrength * 0.8);
    console.log(`Attraction strength: ${newStrength.toFixed(4)}`);
  }
  
  // Increase attraction radius with ']' key
  if (event.key === ']' || event.key === '}') {
    const newRadius = handAttractors.setRadius(handAttractors.attractionRadius + 10);
    console.log(`Attraction radius: ${newRadius}px`);
  }
  
  // Decrease attraction radius with '[' key
  if (event.key === '[' || event.key === '{') {
    const newRadius = handAttractors.setRadius(handAttractors.attractionRadius - 10);
    console.log(`Attraction radius: ${newRadius}px`);
  }
  // Add dust burst effect across the bottom of the screen
  for (let x = 0; x < width; x += width/20) {
    atmosphere.addLocalEffect(x, height - 20, 'dust', 5);
  }
}

function displayDebugInfo() {
  push();
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  
  text(`FPS: ${Math.round(frameRate())}`, 10, height - 40);
  text(`Plants: ${garden.plants.length}`, 10, height - 20);
  text(`Particles: ${garden.getParticleCount()}`, 10, height - 60);
  text(`Springs: ${garden.getSpringCount()}`, 10, height - 80);
  text(`Theme: ${garden.getCurrentTheme()}`, 10, height - 100);
  text(`Hand Attraction: ${handAttractors.enabled ? 'ON' : 'OFF'}`, 10, height - 120);
  text(`Hand Chains: ${showHandChains ? 'ON' : 'OFF'}`, 10, height - 140);
  text(`Attraction Strength: ${handAttractors.attractionStrength.toFixed(4)}`, 10, height - 160);
  text(`Attraction Radius: ${handAttractors.attractionRadius}px`, 10, height - 180);
  text(`Frame Interval: ${Math.round(frameInterval)}ms`, 10, height - 200);
  
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Update button positions
  resetButton.x = windowWidth - 120;
  chainsButton.x = windowWidth - 190;
  
  // Update hand attractors for resize
  handAttractors.windowResized();
  // Update atmosphere
  // atmosphere.windowResized();
  
  // Clear physics in the hand visualizer to prevent issues after resize
  if (handVisualizer) {
    handVisualizer.clear();
  }
}

function gotHands(results) {
  // Store hands data with safety checks
  hands = results || [];
  if (hands.length > 0) {
    for (let i = 0; i < hands.length; i++) {
      // Flip all keypoints
      for (let j = 0; j < hands[i].keypoints.length; j++) {
        hands[i].keypoints[j].x = width - hands[i].keypoints[j].x;
      }
      
      // Flip all named hand parts
      if (hands[i].thumb_tip) hands[i].thumb_tip.x = width - hands[i].thumb_tip.x;
      if (hands[i].index_finger_tip) hands[i].index_finger_tip.x = width - hands[i].index_finger_tip.x;
      if (hands[i].middle_finger_tip) hands[i].middle_finger_tip.x = width - hands[i].middle_finger_tip.x;
      if (hands[i].ring_finger_tip) hands[i].ring_finger_tip.x = width - hands[i].ring_finger_tip.x;
      if (hands[i].pinky_tip) hands[i].pinky_tip.x = width - hands[i].pinky_tip.x;
      if (hands[i].wrist) hands[i].wrist.x = width - hands[i].wrist.x;
    }
  }
}

// Handle detected gestures
function handleGestures(gestures) {
  // Skip if no gestures detected
  if (!gestures) return;
  
  try {
    // Pinch gesture is now handled directly in HandAttractors
    // for both attraction and theme changes
    
    // Point and hold at top edge - toggle debug
    if (gestures.pointing && 
        hands[0].index_finger_tip && 
        hands[0].index_finger_tip.y < 50) {
      // Only toggle occasionally to prevent rapid switching
      if (Math.random() < 0.05) { 
        showDebug = !showDebug;
        console.log("Debug mode: " + (showDebug ? "ON" : "OFF"));
      }
    }
  } catch (e) {
    console.error("Error handling gestures:", e);
  }
}

// HandVisualizer class to create a volumetric hand with chains fixed to it
class HandVisualizer {
  constructor() {
    this.chains = [];
    this.maxChains = 12;
    this.handPoints = [];
    this.handVisible = false;
    this.lastHandPosition = null;
    
    // Track which keypoints already have chains attached
    this.attachedPoints = new Set();
    
    // Chain colors in green shades
    this.chainColors = [
      [100, 220, 80, 200],  // Light green
      [60, 180, 60, 200],   // Medium green
      [40, 150, 50, 200],   // Dark green
      [120, 200, 40, 200],  // Yellow-green
      [80, 190, 100, 200]   // Blue-green
    ];
    
    // Set up physics engine for the chains
    this.setupPhysics();
    
    // Track which keypoints have chains
    this.chainsMap = new Map(); // Maps keypoint index to chain info
  }
  
  setupPhysics() {
    // Create a separate physics engine for the chains
    this.engine = Matter.Engine.create({
      enableSleeping: false,
      constraintIterations: 3,
      positionIterations: 6,
      velocityIterations: 4
    });
    
    // Set gravity to zero for the floating effect
    this.engine.world.gravity.y = 0;
    this.engine.world.gravity.x = 0;
    
    // Store collections of bodies and constraints
    this.bodies = [];
    this.constraints = [];
  }
  
  update(hand) {
    // Update physics
    Matter.Engine.update(this.engine, 1000 / 60);
    
    if (!hand || !hand.keypoints) {
      this.handVisible = false;
      this.fadeChains();
      return;
    }
    
    // Store keypoints for drawing
    this.handPoints = hand.keypoints;
    this.handVisible = true;
    
    // Track hand movement for chain creation
    const wrist = hand.wrist || hand.keypoints[0];
    if (wrist) {
      // Create new chains occasionally when hand is moving
      if (this.lastHandPosition) {
        const moveDistance = dist(wrist.x, wrist.y, this.lastHandPosition.x, this.lastHandPosition.y);
        
        // Create new chains based on hand movement when hand is moving
        if (moveDistance > 5 && random() < 0.15) {
          this.tryCreateNewChain(hand);
        }
      }
      
      this.lastHandPosition = { x: wrist.x, y: wrist.y };
    }
    
    // Update existing chains
    this.updateChains(hand);
  }
  
  tryCreateNewChain(hand) {
    // Only create chains if we're below the maximum
    if (this.chains.length >= this.maxChains) return;
    
    // Important points to consider for attaching chains (fingertips and knuckles)
    const keyPoints = [0, 4, 8, 12, 16, 20];
    
    // Get available points that don't already have chains
    const availablePoints = keyPoints.filter(idx => !this.chainsMap.has(idx));
    
    // If all key points have chains, try other points
    if (availablePoints.length === 0) {
      // Try some secondary points (middle and base knuckles)
      const secondaryPoints = [1, 2, 5, 6, 9, 10, 13, 14, 17, 18];
      for (const idx of secondaryPoints) {
        if (!this.chainsMap.has(idx)) {
          availablePoints.push(idx);
        }
      }
    }
    
    // If there are available points, choose one randomly
    if (availablePoints.length > 0) {
      // Randomly choose a point
      const chosenIdx = availablePoints[Math.floor(random(availablePoints.length))];
      const keypoint = hand.keypoints[chosenIdx];
      
      if (keypoint) {
        // Create a chain attached to this point
        this.createChainAttachedToPoint(keypoint.x, keypoint.y, chosenIdx);
      }
    }
  }
  
  createChainAttachedToPoint(x, y, keypointIndex) {
    // Create a chain that's fixed to the given hand point
    const links = floor(random(5, 12));
    const colorIndex = floor(random(this.chainColors.length));
    const chainColor = this.chainColors[colorIndex];
    // const linkSize = random(4, 8);
    const linkSize = 4
    
    // Chain info object
    const chain = {
      keypointIndex: keypointIndex,  // Store which keypoint this is attached to
      links: [],
      constraints: [],
      color: chainColor,
      linkSize: linkSize,
      age: 0,
      maxAge: random(150, 300),  // Longer lifespan since they're attached
      active: true
    };
    
    // Create chain links
    let prevBody = null;
    
    for (let i = 0; i < links; i++) {
      // Calculate position with slight offset from the starting point
      const offsetX = i > 0 ? random(-3, 3) : 0;
      const offsetY = i > 0 ? random(-3, 3) : 0;
      
      // Start at the keypoint, then extend outward
      const linkX = x + i * 10 + offsetX;
      const linkY = y + offsetY;
      
      // Create circle body with no gravity effect
      const body = Matter.Bodies.circle(linkX, linkY, linkSize * 0.5, {
        frictionAir: 0.2,  // Higher air friction for more organic movement
        restitution: 0.003,  // Some bounciness
        density: 0.001,    // Very light
        collisionFilter: {
          group: 0,
          category: 0x0001,
          mask: 0x0001
        }
      });
      
      // Store body
      chain.links.push(body);
      this.bodies.push(body);
      
      // Add to world
      Matter.World.add(this.engine.world, body);
      
      // Connect to previous link with constraint
      if (prevBody) {
        const constraint = Matter.Constraint.create({
          bodyA: prevBody,
          bodyB: body,
          stiffness: 0.04,  // Slightly stronger for attached chains
          damping: 0.1,
          length: linkSize * 2.2
        });
        
        chain.constraints.push(constraint);
        this.constraints.push(constraint);
        Matter.World.add(this.engine.world, constraint);
      }
      
      prevBody = body;
    }
    
    // Add the chain to our collection
    this.chains.push(chain);
    // Map the keypoint index to this chain
    this.chainsMap.set(keypointIndex, chain);
  }
  
  updateChains(hand) {
    // Update each chain
    for (const chain of this.chains) {
      // Gradually age the chain
      chain.age += 0.5;
      
      // If the chain is attached to a keypoint, update its position
      if (chain.active && chain.keypointIndex !== undefined && chain.links.length > 0) {
        const keypoint = this.handPoints[chain.keypointIndex];
        
        if (keypoint) {
          // Move the first body to the keypoint position
          Matter.Body.setPosition(chain.links[0], {
            x: keypoint.x,
            y: keypoint.y
          });
          
          // Make the first body static so it stays fixed to the hand
          Matter.Body.setStatic(chain.links[0], true);
        } else {
          // If keypoint is not available, mark chain as detached
          chain.active = false;
        }
      }
      
    }
    
    // Remove old chains
    for (let i = this.chains.length - 1; i >= 0; i--) {
      const chain = this.chains[i];
      
      if (chain.age > chain.maxAge) {
        // Remove from mapping
        if (chain.keypointIndex !== undefined) {
          this.chainsMap.delete(chain.keypointIndex);
        }
        
        // Remove from world
        for (const link of chain.links) {
          Matter.World.remove(this.engine.world, link);
          this.bodies = this.bodies.filter(b => b !== link);
        }
        
        for (const constraint of chain.constraints) {
          Matter.World.remove(this.engine.world, constraint);
          this.constraints = this.constraints.filter(c => c !== constraint);
        }
        
        // Remove from array
        this.chains.splice(i, 1);
      }
    }
  }
  
  fadeChains() {
    // Age chains faster when hand is not visible
    for (const chain of this.chains) {
      chain.age += 2;
      chain.active = false; // Mark as detached when hand is not visible
    }
  }
  
  drawVolumetricHand() {
    if (!this.handVisible) return;
    
    push();
    
    // Draw connections with bezier curves for smoothness
    const connections = handPose.getConnections();
    if (connections) {
      for (let i = 0; i < connections.length; i++) {
        const [indexA, indexB] = connections[i];
        
        if (this.handPoints[indexA] && this.handPoints[indexB]) {
          const pointA = this.handPoints[indexA];
          const pointB = this.handPoints[indexB];
          
          // Draw volumetric connections
          this.drawSmoothConnection(pointA, pointB);
        }
      }
    }
    
    // Draw joints
    for (let i = 0; i < this.handPoints.length; i++) {
      const point = this.handPoints[i];
      if (point) {
        // Determine joint size based on position (larger near wrist, smaller at fingertips)
        let jointSize = 12;
        if (i >= 1 && i <= 4) jointSize = 10; // Base joints
        if (i >= 5 && i <= 16) jointSize = 8;  // Middle joints
        if (i >= 17) jointSize = 6;            // Fingertips
        
        // Draw joint with outline effect
        noFill();
        stroke(255, 255, 255, 180);
        strokeWeight(1.5);
        ellipse(point.x, point.y, jointSize);
        // Highlight specific joints
        if (i === 0) { // Wrist
          fill(200, 255, 200, 100);
          noStroke();
          ellipse(point.x, point.y, jointSize * 1.5);
        }
        else if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) { // Fingertips
          fill(220, 255, 220, 80);
          noStroke();
          ellipse(point.x, point.y, jointSize);
        }
        
        // Special highlight for points with chains attached
        if (this.chainsMap.has(i)) {
          noFill();
          stroke(120, 255, 120, 150);
          strokeWeight(1);
          ellipse(point.x, point.y, jointSize * 1.3);
        }
      }
    }
    
    pop();
  }
  
  drawSmoothConnection(pointA, pointB) {
    push();
    // Line width based on finger part (thicker near palm, thinner at fingertips)
    const distToWrist = dist(pointA.x, pointA.y, this.handPoints[0].x, this.handPoints[0].y);
    const lineWidth = map(distToWrist, 0, 250, 5, 2);
    
    // Draw with transparent stroke
    noFill();
    stroke(255, 255, 255, 180);
    strokeWeight(lineWidth);
    
    // Calculate control points for bezier curve (30% along the line on each side)
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const len = sqrt(dx*dx + dy*dy);
    
    // Draw curve
    line(pointA.x, pointA.y, pointB.x, pointB.y);
    
    pop();
  }
  
  drawChains() {
    push();
    noFill();
    strokeJoin(ROUND);
    
    for (const chain of this.chains) {
      const lifeRatio = chain.age / chain.maxAge;
      
      // Calculate alpha based on age
      const alpha = lifeRatio < 0.2 
        ? map(lifeRatio, 0, 0.2, 0, chain.color[3])  // Fade in
        : lifeRatio > 0.8 
          ? map(lifeRatio, 0.8, 1, chain.color[3], 0)  // Fade out
          : chain.color[3];  // Full opacity in the middle
      
      // Set stroke color with alpha
      stroke(chain.color[0], chain.color[1], chain.color[2], alpha);
      
      // Draw links
      for (let i = 0; i < chain.links.length; i++) {
        const link = chain.links[i];
        
        // Draw link as glowing circle
        strokeWeight(1.5);
        ellipse(link.position.x, link.position.y, chain.linkSize *(chain.links.length - i)*0.5);
        fill(chain.color[0], chain.color[1], chain.color[2], alpha * 0.5);
        
        // Draw inner circle with variation
        strokeWeight(0.8);
        // ellipse(link.position.x, link.position.y, chain.linkSize);
      }
      
      // Draw connections between links
      strokeWeight(1);
      for (let i = 1; i < chain.links.length; i++) {
        const prev = chain.links[i-1];
        const curr = chain.links[i];
        
        line(prev.position.x, prev.position.y, curr.position.x, curr.position.y);
      }
      
    }
    
    pop();
  }
  
  drawLeafElement(x, y, size, color, alpha) {
    push();
    // Slightly lighter and more translucent than the chains
    fill(color[0] + 40, color[1] + 20, color[2], alpha * 0.7);
    noStroke();
    
    // Rotate to random angle
    translate(x, y);
    rotate(random(TWO_PI));
    
    // Draw leaf
    beginShape();
    vertex(0, 0);
    bezierVertex(size * 1, -size * 0.3, size, -size * 0.2, size * 1.2, 0);
    bezierVertex(size, size * 0.2, size * 0.5, size * 0.3, 0, 0);
    endShape();
    
    pop();
  }
  
  draw(showChains = true) {
    // Draw the chains if enabled
    if (showChains) {
      this.drawChains();
    }
    
    // Always draw the volumetric hand
    this.drawVolumetricHand();
  }
  
  clear() {
    // Clear physics engine when needed
    for (const body of this.bodies) {
      Matter.World.remove(this.engine.world, body);
    }
    for (const constraint of this.constraints) {
      Matter.World.remove(this.engine.world, constraint);
    }
    
    this.bodies = [];
    this.constraints = [];
    this.chains = [];
    this.chainsMap.clear();
  }
}