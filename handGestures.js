// handGestures.js - Detect and respond to hand gestures

class HandGestures {
    constructor() {
      this.gestures = {
        pointing: false,
        pinch: false,
        grab: false,
        wave: false
      };
      
      this.history = [];
      this.historyLength = 10; // Number of frames to keep for motion detection
      this.lastGestureTime = 0;
      this.gestureCooldown = 500; // ms between gesture triggers
    }
    
    // Update with latest hand data
    update(hand) {
      if (!hand) {
        this.resetGestures();
        return this.gestures;
      }
      
      // Store hand position history for motion detection
      this.updateHistory(hand);
      
      // Detect various gestures
      this.detectPointing(hand);
      this.detectPinch(hand);
      
      return this.gestures;
    }
    
    // Reset all gesture states
    resetGestures() {
      for (const gesture in this.gestures) {
        this.gestures[gesture] = false;
      }
    }
    
    // Update hand position history
    updateHistory(hand) {
      // Add current wrist position to history
      if (hand.keypoints && hand.keypoints[0]) {
        const wrist = hand.keypoints[0];
        this.history.push({
          x: wrist.x,
          y: wrist.y,
          timestamp: Date.now()
        });
        
        // Keep history at desired length
        if (this.history.length > this.historyLength) {
          this.history.shift();
        }
      }
    }
    
    // Detect pointing gesture (extended index finger)
    detectPointing(hand) {
      if (!hand.thumb_tip || !hand.index_finger_tip) return;
      
      // Check if index finger is extended
      const indexExtended = this.isFingerExtended(hand, 'index');
      const otherFingersCurled = 
        !this.isFingerExtended(hand, 'middle') && 
        !this.isFingerExtended(hand, 'ring') && 
        !this.isFingerExtended(hand, 'pinky');
      
      this.gestures.pointing = indexExtended && otherFingersCurled;
    }
    
    // Detect pinch gesture (thumb and index finger close together)
    detectPinch(hand) {
      if (!hand.thumb_tip || !hand.index_finger_tip) return;
      
      const thumbTip = hand.thumb_tip;
      const indexTip = hand.index_finger_tip;
      
      // Calculate distance between thumb and index finger
      const distance = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
      
      // Pinch detected if distance is small
      this.gestures.pinch = distance < 20;
    }
    
    
    
    // Helper: Check if a finger is extended
    isFingerExtended(hand, fingerName) {
      const tipKey = `${fingerName}_finger_tip`;
      const pipKey = `${fingerName}_finger_pip`; // Proximal interphalangeal joint
      const mcpKey = `${fingerName}_finger_mcp`; // Metacarpophalangeal joint
      
      if (!hand[tipKey] || !hand[pipKey] || !hand[mcpKey]) return false;
      
      const tip = hand[tipKey];
      const pip = hand[pipKey];
      const mcp = hand[mcpKey];
      
      // Calculate angles and distances
      const distTipPip = dist(tip.x, tip.y, pip.x, pip.y);
      const distPipMcp = dist(pip.x, pip.y, mcp.x, mcp.y);
      const distTipMcp = dist(tip.x, tip.y, mcp.x, mcp.y);
      
      // A finger is extended if the tip is far from the MCP
      // and if the tip-pip-mcp points are roughly in a line
      const extended = distTipMcp > (distPipMcp * 1.5);
      
      return extended;
    }
    
    // Draw visualization of detected gestures
    drawDebug() {
      push();
      fill(255);
      noStroke();
      textSize(14);
      textAlign(LEFT);
    
      // Reset fill color
      fill(255);
      
      // Draw movement trails
      if (this.history.length > 1) {
        noFill();
        stroke(0, 255, 255, 150);
        strokeWeight(2);
        beginShape();
        for (const point of this.history) {
          vertex(point.x, point.y);
        }
        endShape();
      }
      
      pop();
    }
  }