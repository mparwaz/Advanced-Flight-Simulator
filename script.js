  // --- Scene Setup ---
        let scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        let renderer;
        
        

       
        
        
        // DOM elements
        const speedDisplay = document.getElementById('speed-display');
        const altitudeDisplay = document.getElementById('altitude-display');
        const pitchDisplay = document.getElementById('pitch-display');
        const rollDisplay = document.getElementById('roll-display');
        const headingDisplay = document.getElementById('heading-display');
        const flapsDisplay = document.getElementById('flaps-display');
        const gearDisplay = document.getElementById('gear-display');
        const brakesDisplay = document.getElementById('brakes-display');
        const timeDisplay = document.getElementById('time-display');
        const mapContainer = document.getElementById('map-container');
        const mapCanvas = document.getElementById('map-canvas');
        const mapOverlayCanvas = document.getElementById('map-overlay-canvas');
        const closeMapButton = document.getElementById('close-map-button');
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                init();
            }, 500);
        });

              function init() {
            scene = new THREE.Scene();
            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x87CEEB);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.body.appendChild(renderer.domElement);
            
            mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
            scene.fog = new THREE.Fog(0x87CEEB, 1000, 3000);
            
            ambientLight = new THREE.AmbientLight(0x606060);
            scene.add(ambientLight);
            
            sun = new THREE.DirectionalLight(0xffffff, 1.5);
            sun.position.set(500, 1000, 500).normalize();
            sun.castShadow = true;
            sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
            sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 2000;
            sun.shadow.camera.left = -1000; sun.shadow.camera.right = 1000;
            sun.shadow.camera.top = 1000; sun.shadow.camera.bottom = -1000;
            scene.add(sun);
            
            createPlayer();
            createDayNightCycle();
            setupControls();
            setupMap();
            updateChunks();
            animate();
        }
        // --- Player Aircraft (and other core components) ---
        let player; let playerVelocity = new THREE.Vector3(0, 0, 0); let playerAngularVelocity = new THREE.Vector3(0, 0, 0); let flapsExtended = 0; let gearExtended = true; let brakeForce = 0; let isBraking = false;let mainCamera; let cockpitCamera; let isCockpitView = false; let chaseCameraDistance = 30; // The initial zoom distance
            const MIN_ZOOM = 15;          // How close you can zoom in
            const MAX_ZOOM = 100; 
            let lastTime = 0;
            let sun, moonlight, ambientLight;
            let daySkybox, nightSkybox;
            let inGameTime = 0.25; // Start at sunrise (0.25 = 6 AM)
            const timeSpeed = 0.0001; // Adjust this to make the day go faster or slower
            let strobeLights = [];
            let beaconLight;
            let landingLights = [];
                function createPlayer() {
            // Main physics and camera container
            player = new THREE.Group();
            player.position.set(0, 3.5, 0);
            scene.add(player);
   
        
   
            // This new group will hold all the visible parts of the plane
            playerModel = new THREE.Group();
            player.add(playerModel);

            // --- Cockpit Camera ---
            cockpitCamera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 5000);
            cockpitCamera.position.set(0, 1.9, 5); // Pilot's eye position
            player.add(cockpitCamera); // Attach camera to the main player group

            // --- REMAINDER OF THE FUNCTION ---
            // NOTE: Every '.add()' now uses 'playerModel' instead of 'player'
            
            const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
            const fuselageGeometry = new THREE.CylinderGeometry(1.8, 1.5, 18, 16);
            fuselageGeometry.rotateX(Math.PI / 2);
            const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
            fuselage.castShadow = true;
            fuselage.receiveShadow = true;
            playerModel.add(fuselage);

            const noseConeGeometry = new THREE.ConeGeometry(1.5, 5, 16);
            noseConeGeometry.rotateX(Math.PI / 2);
            const noseCone = new THREE.Mesh(noseConeGeometry, fuselageMaterial);
            noseCone.position.z = 9 + 2.5;
            playerModel.add(noseCone);

            const tailConeGeometry = new THREE.ConeGeometry(1.5, 6, 16);
            tailConeGeometry.rotateX(-Math.PI / 2);
            const tailCone = new THREE.Mesh(tailConeGeometry, fuselageMaterial);
            tailCone.position.z = -9 - 3;
            playerModel.add(tailCone);

            const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, opacity: 0.4, transparent: true, roughness: 0.1, metalness: 0.9 });
            const cockpitGeometry = new THREE.SphereGeometry(1.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            cockpitGeometry.rotateX(Math.PI / 2);
            const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
            cockpit.position.set(0, 2.2, 6);
            playerModel.add(cockpit);

            const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x66ccff, opacity: 0.8, transparent: true });
            for (let i = 0; i < 8; i++) {
                const windowGeometry = new THREE.PlaneGeometry(1, 0.8);
                windowGeometry.rotateY(Math.PI / 2);
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(1.75, 1.2, -6 + i * 1.5);
                playerModel.add(window);
                const windowRight = window.clone();
                windowRight.position.x = -1.75;
                playerModel.add(windowRight);
            }

            const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });
            const singleWingSpan = 20;
            const wingThickness = 0.2;
            const wingChord = 4.0;
            const wingGeometry = new THREE.BoxGeometry(singleWingSpan, wingThickness, wingChord);
            const fuselageRadius = 1.8;
            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(fuselageRadius + (singleWingSpan / 2), 0, 0);
            rightWing.castShadow = true;
            rightWing.receiveShadow = true;
            playerModel.add(rightWing);
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-(fuselageRadius + (singleWingSpan / 2)), 0, 0);
            leftWing.castShadow = true;
            leftWing.receiveShadow = true;
            playerModel.add(leftWing);
            
            createAircraftLights(playerModel, leftWing, rightWing);

            const aileronMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
            const aileronGeometry = new THREE.BoxGeometry(5, 0.2, 1);
            const rightAileron = new THREE.Mesh(aileronGeometry, aileronMaterial);
            rightAileron.position.set(7, 0, 1.5);
            rightWing.add(rightAileron);
            const leftAileron = rightAileron.clone();
            leftAileron.position.x *= -1;
            leftWing.add(leftAileron);

            const flapMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
            const flapGeometry = new THREE.BoxGeometry(6, 0.2, 1.5);
            const rightFlap = new THREE.Mesh(flapGeometry, flapMaterial);
            rightFlap.position.set(-3, 0, 1.25);
            rightWing.add(rightFlap);
            const leftFlap = rightFlap.clone();
            leftFlap.position.x *= -1;
            leftWing.add(leftFlap);

            const hTailGeometry = new THREE.BoxGeometry(8, 0.3, 3);
            const hTail = new THREE.Mesh(hTailGeometry, wingMaterial);
            hTail.position.set(0, 1.5, -14);
            playerModel.add(hTail);

            const elevatorMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
            const elevatorGeometry = new THREE.BoxGeometry(7, 0.2, 1.5);
            const leftElevator = new THREE.Mesh(elevatorGeometry, elevatorMaterial);
            leftElevator.position.set(-3.5, 0, -1.5);
            hTail.add(leftElevator);
            const rightElevator = leftElevator.clone();
            rightElevator.position.set(3.5, 0, -1.5);
            hTail.add(rightElevator);

            const vTailGeometry = new THREE.BoxGeometry(0.8, 6, 3);
            const vTail = new THREE.Mesh(vTailGeometry, wingMaterial);
            vTail.position.set(0, 4, -14);
            playerModel.add(vTail);

            const rudderMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
            const rudderGeometry = new THREE.BoxGeometry(0.8, 5, 1.5);
            const rudder = new THREE.Mesh(rudderGeometry, rudderMaterial);
            rudder.position.set(0, 0.5, -1.5);
            vTail.add(rudder);

            const engineMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.1 });
            const leftEngineGroup = new THREE.Group();
            const engineCylinderGeometry = new THREE.CylinderGeometry(1.8, 1.5, 6, 16);
            engineCylinderGeometry.rotateX(Math.PI / 2);
            leftEngineGroup.add(new THREE.Mesh(engineCylinderGeometry, engineMaterial));
            const intakeGeometry = new THREE.CylinderGeometry(1.2, 1.5, 1, 16);
            intakeGeometry.rotateX(Math.PI / 2);
            const leftIntake = new THREE.Mesh(intakeGeometry, engineMaterial);
            leftIntake.position.z = 3;
            leftEngineGroup.add(leftIntake);
            const exhaustGeometry = new THREE.CylinderGeometry(1.2, 1, 1, 16);
            exhaustGeometry.rotateX(Math.PI / 2);
            const leftExhaust = new THREE.Mesh(exhaustGeometry, engineMaterial);
            leftExhaust.position.z = -3;
            leftEngineGroup.add(leftExhaust);
            leftEngineGroup.position.set(-8, -1, 0);
            playerModel.add(leftEngineGroup);
            const rightEngineGroup = leftEngineGroup.clone();
            rightEngineGroup.position.set(8, -1, 0);
            playerModel.add(rightEngineGroup);

            const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
            const strutMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
            const frontWheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16);
            frontWheelGeometry.rotateX(Math.PI / 2);
            const frontWheel = new THREE.Mesh(frontWheelGeometry, wheelMaterial);
            frontWheel.position.set(0, -2.5, 5);
            playerModel.add(frontWheel);
            const frontStrutGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
            const frontStrut = new THREE.Mesh(frontStrutGeometry, strutMaterial);
            frontStrut.position.set(0, -1.5, 5);
            playerModel.add(frontStrut);
            const leftWheel = frontWheel.clone();
            leftWheel.position.set(-5, -2.5, -5);
            playerModel.add(leftWheel);
            const leftStrut = frontStrut.clone();
            leftStrut.position.set(-5, -1.5, -5);
            playerModel.add(leftStrut);
            const rightWheel = frontWheel.clone();
            rightWheel.position.set(5, -2.5, -5);
            playerModel.add(rightWheel);
            const rightStrut = frontStrut.clone();
            rightStrut.position.set(5, -1.5, -5);
            playerModel.add(rightStrut);

            const gearDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
            const gearDoorGeometry = new THREE.BoxGeometry(1, 0.2, 2);
            const leftGearDoor = new THREE.Mesh(gearDoorGeometry, gearDoorMaterial);
            leftGearDoor.position.set(-5, -0.5, -4);
            playerModel.add(leftGearDoor);
            const rightGearDoor = leftGearDoor.clone();
            rightGearDoor.position.set(5, -0.5, -4);
            playerModel.add(rightGearDoor);
            const noseGearDoor = new THREE.Mesh(gearDoorGeometry, gearDoorMaterial);
            noseGearDoor.position.set(0, -0.5, 4);
            playerModel.add(noseGearDoor);

            player.controlSurfaces = { leftAileron, rightAileron, leftFlap, rightFlap, leftElevator, rightElevator, rudder, frontWheel, leftWheel, rightWheel, frontStrut, leftStrut, rightStrut, leftGearDoor, rightGearDoor, noseGearDoor, gearExtended: true };
        }
        
                function createAircraftLights(playerModel, leftWing, rightWing) {
            // --- Navigation Lights (Red & Green) ---
            const redNavLight = new THREE.PointLight(0xff0000, 2, 10);
            redNavLight.position.set(-10, 0, 0); // Position on the left wingtip
            leftWing.add(redNavLight);

            const greenNavLight = new THREE.PointLight(0x00ff00, 2, 10);
            greenNavLight.position.set(10, 0, 0); // Position on the right wingtip
            rightWing.add(greenNavLight);

            // --- Strobe Lights (Flashing White) ---
            const strobeLight1 = new THREE.PointLight(0xffffff, 0, 20); // Starts off
            strobeLight1.position.set(-10.5, 0, 0);
            leftWing.add(strobeLight1);

            const strobeLight2 = new THREE.PointLight(0xffffff, 0, 20); // Starts off
            strobeLight2.position.set(10.5, 0, 0);
            rightWing.add(strobeLight2);
            strobeLights.push(strobeLight1, strobeLight2); // Add to array for animation

            // --- Beacon Light (Pulsing Red) ---
            beaconLight = new THREE.PointLight(0xff0000, 0, 30); // Starts off
            beaconLight.position.set(0, 2.5, -2); // On top of the fuselage
            playerModel.add(beaconLight);

            // --- Landing Lights (Forward Facing) ---
            for (let i = 0; i < 2; i++) {
                const landingLight = new THREE.SpotLight(0xffffff, 0, 500, Math.PI / 8, 0.5, 2);
                const target = new THREE.Object3D();
                
                // Position lights inboard on the wings
                const wing = (i === 0) ? rightWing : leftWing;
                const xPos = (i === 0) ? 5 : -5;
                landingLight.position.set(xPos, -0.5, 1.5);
                target.position.set(xPos, -1, 100); // Target is far in front of the light

                wing.add(landingLight);
                wing.add(target);
                landingLight.target = target;
                
                landingLights.push(landingLight);
            }
        }
        
                   function updateAircraftLights() {
            // Get a consistent time value, scaled for convenience
            const time = performance.now() * 0.002;

            // --- Strobe Light Logic (Double Flash) ---
            // This creates a "square wave" for a solid on/off flash.
            // The expression inside floor will be 0, 1, 2, 3...
            // The modulo (%) makes it repeat a 0, 1 pattern.
            const strobeCycle = Math.floor(time * 0.5) % 2; 
            // This creates a brief "double flash" effect within the main cycle
            const strobeSubFlash = Math.floor(time * 0) % 2;
            
            // The light is on only during the first part of the cycle, and for a sub-flash.
            const strobeIntensity = (strobeCycle === 0 && strobeSubFlash === 0) ? 5 : 0;
            strobeLights.forEach(light => light.intensity = strobeIntensity);

            // --- Beacon Light Logic (Slow Pulse) ---
            if (beaconLight) {
                // This sine wave creates a smooth pulse from 0 to 3.
                beaconLight.intensity = (Math.sin(time * 2) + 1) / 2 * 3;
            }

            // --- Landing Light Logic (Tied to Gear) ---
            // This logic remains the same.
            const landingLightIntensity = gearExtended ? 25 : 0;
            landingLights.forEach(light => light.intensity = landingLightIntensity);
        }
        
              const keys = {}; let isLookingAround = false; let cameraYaw = 0; let cameraPitch = 0; const cameraRotationSpeed = 0.005; const maxCameraPitch = Math.PI / 2 - 0.1;
                             
                             function setupControls() {
    // A single, comprehensive event listener for all keydown events
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = true;

        // Handle single-press actions
        if (key === 'm') toggleMapFullscreen();
        if (key === 'f') toggleFlaps();
        if (key === 'g') toggleGear();
        if (key === 'c') toggleView(); // Fixed: Now correctly listens for 'c'
        if (key === 'r') resetPlayer(); // Merged from the duplicate listener

        if (key === 'b') {
            isBraking = true;
            brakesDisplay.textContent = 'ON';
        }
    });

    // A single event listener for all keyup events
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = false;

        if (key === 'b') {
            isBraking = false;
            brakesDisplay.textContent = 'OFF';
        }
    });
    
    

    // Mouse and UI button event listeners
    renderer.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    renderer.domElement.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            isLookingAround = true;
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            isLookingAround = false;
            document.exitPointerLock();
        }
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isLookingAround) {
            cameraYaw -= (e.movementX || 0) * cameraRotationSpeed;
            cameraPitch -= (e.movementY || 0) * cameraRotationSpeed;
            cameraPitch = Math.max(-maxCameraPitch, Math.min(maxCameraPitch, cameraPitch));
        }
    });
    
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
            renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 2) { isLookingAround = true; renderer.domElement.requestPointerLock(); } });
            document.addEventListener('mouseup', (e) => { if (e.button === 2) { isLookingAround = false; document.exitPointerLock(); } });
            renderer.domElement.addEventListener('mousemove', (e) => { if (isLookingAround) { cameraYaw -= (e.movementX || 0) * cameraRotationSpeed; cameraPitch -= (e.movementY || 0) * cameraRotationSpeed; cameraPitch = Math.max(-maxCameraPitch, Math.min(maxCameraPitch, cameraPitch)); } });

    document.getElementById('toggle-info-panel').addEventListener('click', (e) => {
        const panel = document.getElementById('info-panel');
        panel.classList.toggle('collapsed');
        e.target.textContent = panel.classList.contains('collapsed') ? '+' : '_';
    });

    document.getElementById('toggle-dashboard').addEventListener('click', (e) => {
        const panel = document.getElementById('dashboard');
        panel.classList.toggle('collapsed');
        e.target.textContent = panel.classList.contains('collapsed') ? '+' : '_';
    });

    document.getElementById('btn-clear-waypoint').addEventListener('click', clearWaypoint);
    document.getElementById('btn-reset').addEventListener('click', resetPlayer);
    
    // --- PC MOUSE WHEEL ZOOM ---
            renderer.domElement.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (isCockpitView) return; // Don't zoom in cockpit view

                // The 0.05 is a sensitivity factor, adjust if zoom is too fast/slow
                chaseCameraDistance += e.deltaY * 0.05;

                // Clamp the zoom to the min/max values
                chaseCameraDistance = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, chaseCameraDistance));
            }, { passive: false });


            // --- MOBILE PINCH-TO-ZOOM ---
            let initialPinchDistance = 0;
            const getDistance = (touches) => {
                return Math.hypot(
                    touches[0].pageX - touches[1].pageX,
                    touches[0].pageY - touches[1].pageY
                );
            };
            renderer.domElement.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    initialPinchDistance = getDistance(e.touches);
                }
            }, { passive: false });
            renderer.domElement.addEventListener('touchmove', (e) => {
                if (!isCockpitView && e.touches.length === 2) {
                    e.preventDefault();
                    const newPinchDistance = getDistance(e.touches);
                    const delta = newPinchDistance - initialPinchDistance;
                    chaseCameraDistance -= delta * 0.1; 
                    chaseCameraDistance = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, chaseCameraDistance));
                    initialPinchDistance = newPinchDistance;
                }
            }, { passive: false });

    setupMobileControls();
}

        
        
                function setupMobileControls() {
            const leftStick = document.getElementById('left-stick');
            const rightStick = document.getElementById('right-stick');
            const leftThumb = leftStick.querySelector('.stick-thumb');
            const rightThumb = rightStick.querySelector('.stick-thumb');
            let leftStickActive = false, rightStickActive = false;
            let leftStickTouchId = null, rightStickTouchId = null;

            // --- Event Listeners for Buttons ---
            document.getElementById('btn-flaps').addEventListener('touchstart', (e) => { e.preventDefault(); toggleFlaps(); });
            document.getElementById('btn-gear').addEventListener('touchstart', (e) => { e.preventDefault(); toggleGear(); });
            document.getElementById('btn-brakes').addEventListener('touchstart', (e) => { e.preventDefault(); isBraking = true; brakesDisplay.textContent = 'ON'; e.currentTarget.classList.add('active'); });
            document.getElementById('btn-brakes').addEventListener('touchend', (e) => { e.preventDefault(); isBraking = false; brakesDisplay.textContent = 'OFF'; e.currentTarget.classList.remove('active'); });
            
            // --- UPDATED VIEW BUTTON LOGIC ---
             document.getElementById('btn-view').addEventListener('touchstart', (e) => { e.preventDefault(); toggleView(); });
            
            document.getElementById('btn-map').addEventListener('touchstart', (e) => { e.preventDefault(); toggleMapFullscreen(); });
            document.getElementById('btn-clear-waypoint').addEventListener('touchstart', (e) => { e.preventDefault(); clearWaypoint(); });
            document.getElementById('btn-reset').addEventListener('touchstart', (e) => { e.preventDefault(); resetPlayer(); });

            // --- Joystick Logic ---
            const handleTouchStart = (e) => {
                const leftRect = leftStick.getBoundingClientRect();
                const rightRect = rightStick.getBoundingClientRect();
                for (const touch of e.changedTouches) {
                    const touchX = touch.clientX;
                    const touchY = touch.clientY;
                    if (touchX >= leftRect.left && touchX <= leftRect.right && touchY >= leftRect.top && touchY <= leftRect.bottom && leftStickTouchId === null) {
                        leftStickActive = true;
                        leftStickTouchId = touch.identifier;
                        leftStick.classList.add('active');
                        updateStickPosition(touch, leftStick, true);
                    } else if (touchX >= rightRect.left && touchX <= rightRect.right && touchY >= rightRect.top && touchY <= rightRect.bottom && rightStickTouchId === null) {
                        rightStickActive = true;
                        rightStickTouchId = touch.identifier;
                        rightStick.classList.add('active');
                        updateStickPosition(touch, rightStick, false);
                    }
                }
            };

            const handleTouchMove = (e) => {
                if (leftStickActive || rightStickActive) e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === leftStickTouchId) {
                        updateStickPosition(touch, leftStick, true);
                    } else if (touch.identifier === rightStickTouchId) {
                        updateStickPosition(touch, rightStick, false);
                    }
                }
            };

            const handleTouchEnd = (e) => {
                for (const touch of e.changedTouches) {
                    if (touch.identifier === leftStickTouchId) {
                        leftStickActive = false;
                        leftStickTouchId = null;
                        leftThumb.style.transform = 'translate(-50%, -50%)';
                        leftStick.classList.remove('active');
                        keys['a'] = false; keys['d'] = false; keys['q'] = false; keys['e'] = false;
                    } else if (touch.identifier === rightStickTouchId) {
                        rightStickActive = false;
                        rightStickTouchId = null;
                        rightThumb.style.transform = 'translate(-50%, -50%)';
                        rightStick.classList.remove('active');
                        keys['w'] = false; keys['s'] = false;
                    }
                }
            };

            document.addEventListener('touchstart', handleTouchStart, { passive: false });
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchEnd);

            function updateStickPosition(touch, stick, isLeft) {
                const rect = stick.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const x = touch.clientX - centerX;
                const y = touch.clientY - centerY;
                const distance = Math.sqrt(x * x + y * y);
                const maxDistance = rect.width / 2;
                const normalizedDistance = Math.min(distance, maxDistance) / maxDistance;
                const angle = Math.atan2(y, x);
                const thumbX = Math.cos(angle) * normalizedDistance * maxDistance * 0.8;
                const thumbY = Math.sin(angle) * normalizedDistance * maxDistance * 0.8;
                stick.querySelector('.stick-thumb').style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

                if (isLeft) {
                    const leftStickX = Math.cos(angle) * normalizedDistance;
                    const leftStickY = Math.sin(angle) * normalizedDistance;
                    keys['a'] = leftStickX < -0.3;
                    keys['d'] = leftStickX > 0.3;
                    keys['e'] = leftStickY < -0.3;
                    keys['q'] = leftStickY > 0.3;
                } else {
                    const rightStickY = Math.sin(angle) * normalizedDistance;
                    keys['w'] = rightStickY < -0.3;
                    keys['s'] = rightStickY > 0.3;
                }
            }
        }
        
        // --- UI Helper Functions ---
        function toggleFlaps() { flapsExtended = flapsExtended === 0 ? 1 : 0; flapsDisplay.textContent = flapsExtended ? 'EXTENDED' : 'RETRACTED'; }
        function toggleGear() { gearExtended = !gearExtended; gearDisplay.textContent = gearExtended ? 'DOWN' : 'UP'; }
        function toggleMapFullscreen() { mapContainer.classList.toggle('fullscreen'); resizeMapCanvases(); }
         function toggleView() { isCockpitView = !isCockpitView; if (playerModel) playerModel.visible = !isCockpitView; document.querySelector('.mobile-controls').style.display = isCockpitView ? 'none' : 'flex'; }
        function clearWaypoint() { waypoint = null; }
      
              function createSky() { const textureLoader = new THREE.TextureLoader(); const skyTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/2294472375_24a3b8ef46_o.jpg'); const skyGeometry = new THREE.SphereGeometry(4000, 32, 32); const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide }); const skybox = new THREE.Mesh(skyGeometry, skyMaterial); scene.add(skybox); scene.onBeforeRender = function() { skybox.position.copy(player.position); } }
        
                function createDayNightCycle() {
            const textureLoader = new THREE.TextureLoader();

            // --- Skyboxes ---
            const dayTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/skybox/sun_sky.jpg');
            const nightTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/skybox/starry_sky.jpg');
            const skyGeometry = new THREE.SphereGeometry(4000, 32, 32);

            // Night sky is always visible
            const nightMaterial = new THREE.MeshBasicMaterial({ map: nightTexture, side: THREE.BackSide });
            nightSkybox = new THREE.Mesh(skyGeometry, nightMaterial);
            scene.add(nightSkybox);

            // Day sky fades in and out over the night sky
            const dayMaterial = new THREE.MeshBasicMaterial({ map: dayTexture, side: THREE.BackSide, transparent: true, opacity: 0 });
            daySkybox = new THREE.Mesh(skyGeometry, dayMaterial);
            scene.add(daySkybox);

            // --- Moonlight ---
            moonlight = new THREE.DirectionalLight(0x405080, 0); // Faint blue light, starts off
            moonlight.position.set(-1000, 1000, 1000);
            scene.add(moonlight);
        }

               function updateDayNightCycle() {
            inGameTime += timeSpeed;
            if (inGameTime > 1) inGameTime = 0;

            const sunAngle = (inGameTime - 0.25) * Math.PI * 2;
            sun.position.set(Math.cos(sunAngle) * 1000, Math.sin(sunAngle) * 1000, 500);

            const dayFactor = Math.max(0, Math.sin(inGameTime * Math.PI * 2));
            
            // --- THIS IS THE MISSING LINE ---
            const nightFactor = Math.pow(1 - dayFactor, 2); // Use pow for a sharper transition

            // --- Update Lights and Sky ---
            sun.intensity = dayFactor * 1.5;
            moonlight.intensity = (1 - dayFactor) * 0.2;
            ambientLight.intensity = dayFactor * 0.6 + (1 - dayFactor) * 0.1;
            daySkybox.material.opacity = Math.pow(dayFactor, 2);
            
            const dayFog = new THREE.Color(0x87CEEB);
            const nightFog = new THREE.Color(0x1a1a2e);
            scene.fog.color.lerpColors(nightFog, dayFog, dayFactor);

            // --- Update Emissive Light Materials ---
            windowMaterial.emissiveIntensity = nightFactor * 1.5;
            lightMaterial.emissiveIntensity = nightFactor * 2.0;
            runwayLightMaterial.emissiveIntensity = nightFactor;
            runwayThresholdGreenMaterial.emissiveIntensity = nightFactor;
            runwayThresholdRedMaterial.emissiveIntensity = nightFactor;
            taxiwayLightMaterial.emissiveIntensity = nightFactor;

            daySkybox.position.copy(player.position);
            nightSkybox.position.copy(player.position);
        }

               // --- World Generation ---
        const chunkSize = 500;
        const renderDistanceChunks = 4;
        const activeChunks = new Map();
        const cityDensity = 0.008;
        const airportDensity = 0.002;

        // --- New & Enhanced Materials ---
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x6B8E23 });
        const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x558B2F });
        const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const runwayMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
        const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        const houseMaterials = [ new THREE.MeshStandardMaterial({ color: 0xC2B280 }), new THREE.MeshStandardMaterial({ color: 0x9e8b8e }), new THREE.MeshStandardMaterial({ color: 0xD3D3D3 }) ];
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        const officeBuildingMaterial = new THREE.MeshStandardMaterial({ color: 0x8F979A, metalness: 0.2, roughness: 0.6 });
        
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x42A5F5, metalness: 0.1, roughness: 0.2, emissive: 0xFFFF00, emissiveIntensity: 0 });
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xFFF59D, emissive: 0xFFF59D, emissiveIntensity: 0 });

        const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const treeLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
        const airportTowerMaterial = new THREE.MeshStandardMaterial({ color: 0xBDBDBD });
        const towerGlassMaterial = new THREE.MeshStandardMaterial({ color: 0x1565C0, transparent: true, opacity: 0.6 });
        const hangarMaterial = new THREE.MeshStandardMaterial({ color: 0x9E9E9E });
        const streetlightMaterial = new THREE.MeshStandardMaterial({ color: 0x616161 });
        
        const runwayLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
        const runwayThresholdGreenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0 });
        const runwayThresholdRedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0 });
        const taxiwayLightMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, emissive: 0x0000ff, emissiveIntensity: 0 });

        function createChunk(chunkX, chunkZ) {
            const chunkKey = `${chunkX}_${chunkZ}`;
            if (activeChunks.has(chunkKey)) return;

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(chunkX * chunkSize, 0, chunkZ * chunkSize);

            const seed = (chunkX * 1000 + chunkZ).toString();
            const random = new Math.seedrandom(seed);

            let chunkType = 'scattered';
            if (random() < airportDensity) chunkType = 'airport';
            else if (random() < cityDensity) chunkType = 'city';
            
            if (chunkType === 'airport') addAirport(chunkGroup, random);
            else if (chunkType === 'city') addCity(chunkGroup, random);
            else addScatteredFeatures(chunkGroup, random);

            scene.add(chunkGroup);
            activeChunks.set(chunkKey, { group: chunkGroup, type: chunkType });
        }

        function addAirport(chunkGroup, random) {
            const airportGroundGeom = new THREE.PlaneGeometry(chunkSize, chunkSize);
            airportGroundGeom.rotateX(-Math.PI / 2);
            const airportGround = new THREE.Mesh(airportGroundGeom, runwayMaterial);
            airportGround.receiveShadow = true;
            chunkGroup.add(airportGround);

            const runwayLength = chunkSize * 0.9;
            const runwayWidth = 30;

            const mainRunwayGeom = new THREE.PlaneGeometry(runwayLength, runwayWidth);
            mainRunwayGeom.rotateX(-Math.PI / 2);
            const mainRunway = new THREE.Mesh(mainRunwayGeom, runwayMaterial);
            mainRunway.position.y = 0.1;
            chunkGroup.add(mainRunway);
            addRunwayMarkings(mainRunway, runwayLength, runwayWidth, '09', '27');

            const crossRunwayGeom = new THREE.PlaneGeometry(runwayWidth, runwayLength);
            crossRunwayGeom.rotateX(-Math.PI / 2);
            const crossRunway = new THREE.Mesh(crossRunwayGeom, runwayMaterial);
            crossRunway.position.y = 0.1;
            chunkGroup.add(crossRunway);
            addRunwayMarkings(crossRunway, runwayLength, runwayWidth, '18', '36', true);

            const taxiwayWidth = 10;
            const taxiwayGeom = new THREE.PlaneGeometry(chunkSize, taxiwayWidth);
            taxiwayGeom.rotateX(-Math.PI / 2);
            const taxiway1 = new THREE.Mesh(taxiwayGeom, runwayMaterial);
            taxiway1.position.set(0, 0.05, runwayWidth * 2);
            chunkGroup.add(taxiway1);
            const taxiway2 = taxiway1.clone();
            taxiway2.position.z = -runwayWidth * 2;
            chunkGroup.add(taxiway2);

            const towerBaseHeight = 40;
            const towerBaseGeom = new THREE.CylinderGeometry(8, 10, towerBaseHeight, 8);
            const towerBase = new THREE.Mesh(towerBaseGeom, airportTowerMaterial);
            towerBase.position.set(runwayWidth * 2.5, towerBaseHeight / 2, -runwayWidth * 2.5);
            towerBase.castShadow = true;
            chunkGroup.add(towerBase);

            const towerTopGeom = new THREE.CylinderGeometry(15, 15, 10, 8);
            const towerTop = new THREE.Mesh(towerTopGeom, towerGlassMaterial);
            towerTop.position.copy(towerBase.position).y += towerBaseHeight / 2 + 5;
            chunkGroup.add(towerTop);

            for (let i = 0; i < 3; i++) {
                const hangar = createHangar(random);
                hangar.position.set(-chunkSize / 4, 15, -chunkSize / 4 + i * 80);
                hangar.rotation.y = Math.PI / 2;
                chunkGroup.add(hangar);
            }
            
            addAirportLights(chunkGroup, runwayLength, runwayWidth);
        }
        
        function addAirportLights(chunkGroup, runwayLength, runwayWidth) {
            const lightGeom = new THREE.SphereGeometry(0.8);
            
            for(let i = 0; i < runwayLength / 25; i++) {
                const zPos = -runwayLength / 2 + i * 25;
                const light1 = new THREE.Mesh(lightGeom, runwayLightMaterial);
                light1.position.set(runwayWidth / 2 + 1, 0.5, zPos);
                chunkGroup.add(light1);
                const light2 = light1.clone();
                light2.position.x = -runwayWidth / 2 - 1;
                chunkGroup.add(light2);
            }

            for(let i = 0; i < chunkSize / 20; i++) {
                const xPos = -chunkSize / 2 + i * 20;
                const light1 = new THREE.Mesh(lightGeom, taxiwayLightMaterial);
                light1.position.set(xPos, 0.5, runwayWidth * 2 + 5);
                chunkGroup.add(light1);
                const light2 = light1.clone();
                light2.position.z = -runwayWidth * 2 - 5;
                chunkGroup.add(light2);
            }
            
            for(let i = 0; i < runwayWidth / 3; i++) {
                const xPos = -runwayWidth / 2 + i * 3;
                const greenLight = new THREE.Mesh(lightGeom, runwayThresholdGreenMaterial);
                greenLight.position.set(xPos, 0.5, -runwayLength / 2 + 2);
                chunkGroup.add(greenLight);
                const redLight = new THREE.Mesh(lightGeom, runwayThresholdRedMaterial);
                redLight.position.set(xPos, 0.5, runwayLength / 2 - 2);
                chunkGroup.add(redLight);
            }
        }

        function addCity(chunkGroup, random) {
            const groundGeom = new THREE.PlaneGeometry(chunkSize, chunkSize);
            groundGeom.rotateX(-Math.PI / 2);
            const ground = new THREE.Mesh(groundGeom, grassMaterial);
            chunkGroup.add(ground);
            
            const roadWidth = 12;
            const numBlocks = 6;
            const blockSize = chunkSize / numBlocks;

            for (let i = 0; i <= numBlocks; i++) {
                const pos = -chunkSize / 2 + i * blockSize;
                const vRoadGeom = new THREE.PlaneGeometry(roadWidth, chunkSize);
                vRoadGeom.rotateX(-Math.PI / 2);
                const vRoad = new THREE.Mesh(vRoadGeom, roadMaterial);
                vRoad.position.set(pos, 0.1, 0);
                chunkGroup.add(vRoad);
                addRoadMarkings(vRoad, chunkSize, true);
                
                const hRoadGeom = new THREE.PlaneGeometry(chunkSize, roadWidth);
                hRoadGeom.rotateX(-Math.PI / 2);
                const hRoad = new THREE.Mesh(hRoadGeom, roadMaterial);
                hRoad.position.set(0, 0.1, pos);
                chunkGroup.add(hRoad);
                addRoadMarkings(hRoad, chunkSize, false);
            }

            for (let i = 0; i < numBlocks; i++) {
                for (let j = 0; j < numBlocks; j++) {
                    const blockCenterX = -chunkSize / 2 + i * blockSize + blockSize / 2;
                    const blockCenterZ = -chunkSize / 2 + j * blockSize + blockSize / 2;
                    
                    if (random() > 0.15) {
                        const buildingType = random();
                        const building = createBuilding(buildingType, random);
                        building.position.set(blockCenterX + (random() - 0.5) * (blockSize - 25), 0, blockCenterZ + (random() - 0.5) * (blockSize - 25));
                        building.rotation.y = Math.floor(random() * 4) * Math.PI / 2;
                        chunkGroup.add(building);
                    }
                    chunkGroup.add(createStreetlight().position.set(blockCenterX - blockSize/2 + roadWidth/2, 0, blockCenterZ - blockSize/2 + roadWidth/2));
                }
            }
        }

        function addScatteredFeatures(chunkGroup, random) {
            const groundGeom = new THREE.PlaneGeometry(chunkSize, chunkSize);
            groundGeom.rotateX(-Math.PI / 2);
            chunkGroup.add(new THREE.Mesh(groundGeom, groundMaterial));

            const road = new THREE.Mesh(new THREE.PlaneGeometry(10, chunkSize), roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.y = 0.1;
            chunkGroup.add(road);
            addRoadMarkings(road, chunkSize, true);
            
            const featureCount = Math.floor(random() * 20) + 10;
            for (let i = 0; i < featureCount; i++) {
                const posX = (random() - 0.5) * chunkSize;
                const posZ = (random() - 0.5) * chunkSize;
                if (Math.abs(posX) < 20) continue;

                if(random() > 0.3) {
                    const tree = createTree(random);
                    tree.position.set(posX, 0, posZ);
                    chunkGroup.add(tree);
                } else {
                    const building = createBuilding(0.3, random);
                    building.position.set(posX, 0, posZ);
                    building.rotation.y = random() * Math.PI * 2;
                    chunkGroup.add(building);
                }
            }
        }
        
        function createBuilding(type, random) {
            const buildingGroup = new THREE.Group();
            let baseWidth, baseDepth, height;

            if (type < 0.6) {
                const material = houseMaterials[Math.floor(random() * houseMaterials.length)];
                baseWidth = random() * 10 + 8;
                baseDepth = random() * 10 + 8;
                height = random() * 5 + 5;
                const baseGeom = new THREE.BoxGeometry(baseWidth, height, baseDepth);
                const base = new THREE.Mesh(baseGeom, material);
                base.position.y = height / 2;
                buildingGroup.add(base);
                const roofGeom = new THREE.ConeGeometry(Math.max(baseWidth, baseDepth) * 0.7, 4, 4);
                const roof = new THREE.Mesh(roofGeom, roofMaterial);
                roof.position.y = height + 1.5;
                roof.rotation.y = Math.PI / 4;
                buildingGroup.add(roof);

            } else {
                baseWidth = random() * 15 + 10;
                baseDepth = random() * 15 + 10;
                height = random() * 40 + 20;
                const baseGeom = new THREE.BoxGeometry(baseWidth, height, baseDepth);
                const base = new THREE.Mesh(baseGeom, officeBuildingMaterial);
                base.position.y = height / 2;
                buildingGroup.add(base);
                const windowGeom = new THREE.PlaneGeometry(baseWidth * 0.8, height * 0.8);
                const windows1 = new THREE.Mesh(windowGeom, windowMaterial);
                windows1.position.set(0, height / 2, baseDepth / 2 + 0.1);
                buildingGroup.add(windows1);
                const windows2 = windows1.clone();
                windows2.rotation.y = Math.PI;
                windows2.position.z = -baseDepth / 2 - 0.1;
                buildingGroup.add(windows2);
                const ventGeom = new THREE.BoxGeometry(2, 3, 2);
                const vent = new THREE.Mesh(ventGeom, streetlightMaterial);
                vent.position.set((random() - 0.5) * baseWidth * 0.8, height + 1.5, (random() - 0.5) * baseDepth * 0.8);
                buildingGroup.add(vent);
            }
            buildingGroup.castShadow = true;
            buildingGroup.receiveShadow = true;
            return buildingGroup;
        }

        function createTree(random) {
            const treeGroup = new THREE.Group();
            const height = random() * 10 + 8;
            const trunkGeom = new THREE.CylinderGeometry(0.5, 0.8, height, 8);
            const trunk = new THREE.Mesh(trunkGeom, treeTrunkMaterial);
            trunk.position.y = height / 2;
            treeGroup.add(trunk);
            const leafGeom = new THREE.IcosahedronGeometry(random() * 3 + 3, 0);
            const leaves = new THREE.Mesh(leafGeom, treeLeafMaterial);
            leaves.position.y = height;
            treeGroup.add(leaves);
            treeGroup.castShadow = true;
            return treeGroup;
        }
        
        function createHangar(random) {
            const group = new THREE.Group();
            const width = 60, depth = 50, height = 30;
            const wallGeom = new THREE.BoxGeometry(width, height, 2);
            const backWall = new THREE.Mesh(wallGeom, hangarMaterial);
            backWall.position.z = -depth/2;
            group.add(backWall);
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2, height, depth), hangarMaterial);
            leftWall.position.x = -width/2;
            group.add(leftWall);
            const rightWall = leftWall.clone();
            rightWall.position.x = width/2;
            group.add(rightWall);
            const roofGeom = new THREE.CylinderGeometry(width / 2, width / 2, depth, 16, 1, false, 0, Math.PI);
            const roof = new THREE.Mesh(roofGeom, hangarMaterial);
            roof.rotation.z = Math.PI / 2;
            roof.position.y = height;
            group.add(roof);
            group.position.y = height/2;
            group.castShadow = true;
            return group;
        }
        
        function createStreetlight() {
            const group = new THREE.Group();
            const postGeom = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
            const post = new THREE.Mesh(postGeom, streetlightMaterial);
            post.position.y = 4;
            group.add(post);
            const armGeom = new THREE.BoxGeometry(2, 0.2, 0.2);
            const arm = new THREE.Mesh(armGeom, streetlightMaterial);
            arm.position.set(1, 8, 0);
            group.add(arm);
            const lightGeom = new THREE.SphereGeometry(0.4);
            const light = new THREE.Mesh(lightGeom, lightMaterial);
            light.position.set(2, 7.5, 0);
            group.add(light);
            return group;
        }

        function addRunwayMarkings(runwayMesh, len, wid, num1, num2, isVertical = false) {
            const threshGeom = new THREE.PlaneGeometry(wid * 0.8, 10);
            const thresh1 = new THREE.Mesh(threshGeom, markingMaterial);
            thresh1.position.set(0, 0.01, -len / 2 + 15);
            const thresh2 = thresh1.clone();
            thresh2.position.z = len / 2 - 15;
            runwayMesh.add(thresh1, thresh2);
            for (let i = 0; i < 10; i++) {
                const dashGeom = new THREE.PlaneGeometry(2, 20);
                const dash = new THREE.Mesh(dashGeom, markingMaterial);
                dash.position.set(0, 0.01, -len/2 + 60 + i * 40);
                runwayMesh.add(dash);
            }
        }

        function addRoadMarkings(roadMesh, len, isVertical = false) {
            const numDashes = Math.floor(len / 20);
            for (let i = 0; i < numDashes; i++) {
                const dashGeom = new THREE.PlaneGeometry(isVertical ? 0.5 : 10, isVertical ? 10 : 0.5);
                const dash = new THREE.Mesh(dashGeom, markingMaterial);
                const pos = -len / 2 + 10 + i * 20;
                if(isVertical) dash.position.z = pos;
                else dash.position.x = pos;
                dash.position.y = 0.01;
                roadMesh.add(dash);
            }
        }
        
        function updateChunks() {
            const playerChunkX = Math.floor(player.position.x / chunkSize);
            const playerChunkZ = Math.floor(player.position.z / chunkSize);
            activeChunks.forEach((chunkData, key) => {
                const [chunkX, chunkZ] = key.split('_').map(Number);
                if (Math.abs(chunkX - playerChunkX) > renderDistanceChunks || Math.abs(chunkZ - playerChunkZ) > renderDistanceChunks) {
                    scene.remove(chunkData.group);
                    chunkData.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose(); } });
                    activeChunks.delete(key);
                }
            });
            for (let x = playerChunkX - renderDistanceChunks; x <= playerChunkX + renderDistanceChunks; x++) {
                for (let z = playerChunkZ - renderDistanceChunks; z <= playerChunkZ + renderDistanceChunks; z++) {
                    createChunk(x, z);
                }
            }
        }

        function findNearestAirportPosition() {
            let closestAirportPos = null;
            let minDistance = Infinity;
            activeChunks.forEach((chunkData, key) => {
                if (chunkData.type === 'airport') {
                    const distance = player.position.distanceTo(chunkData.group.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestAirportPos = chunkData.group.position.clone();
                    }
                }
            });
            return closestAirportPos || new THREE.Vector3(0, 0, 0);
        }
        
        function resetPlayer() {
            const resetPos = findNearestAirportPosition();
            const groundLevel = 0.8 + 2.5;
            player.position.set(resetPos.x, groundLevel, resetPos.z);
            player.quaternion.identity();
            playerVelocity.set(0, 0, 0);
            playerAngularVelocity.set(0, 0, 0);
            cameraYaw = 0;
            cameraPitch = 0;
            const playerEuler = new THREE.Euler().setFromQuaternion(player.quaternion, 'YXZ');
            playerEuler.x = 0;
            playerEuler.z = 0;
            player.quaternion.setFromEuler(playerEuler);
            const offset = new THREE.Vector3(0, 20, -50).applyQuaternion(player.quaternion);
            mainCamera.position.copy(player.position).add(offset);
            mainCamera.lookAt(player.position);
        }
        // --- Minimap ---
        const MINIMAP_SCALE = 0.15; const FULLSCREEN_MAP_SCALE = 0.05; let mapScale = MINIMAP_SCALE; let waypoint = null; let waypointMarker = null;
        function setupMap() {
            resizeMapCanvases();
            const handleMapInteraction = (e) => { e.preventDefault(); e.stopPropagation(); const target = e.target; const isFullscreen = mapContainer.classList.contains('fullscreen'); if (target === closeMapButton || target.id === 'btn-map') { toggleMapFullscreen(); return; } if (isFullscreen) { const eventData = e.touches ? e.touches[0] : e; setWaypointFromClick(eventData); } else { toggleMapFullscreen(); } };
            mapContainer.addEventListener('click', handleMapInteraction); mapContainer.addEventListener('touchstart', handleMapInteraction, { passive: false });
            closeMapButton.addEventListener('click', handleMapInteraction); closeMapButton.addEventListener('touchstart', handleMapInteraction, { passive: false });
            document.getElementById('btn-map').addEventListener('click', handleMapInteraction); document.getElementById('btn-map').addEventListener('touchstart', handleMapInteraction, { passive: false });
        }
        function setWaypointFromClick(event) { const rect = mapCanvas.getBoundingClientRect(); const clickX = event.clientX - rect.left; const clickY = event.clientY - rect.top; const centerX = mapCanvas.width / 2; const centerY = mapCanvas.height / 2; const playerEuler = new THREE.Euler().setFromQuaternion(player.quaternion, 'YXZ'); const playerHeading = playerEuler.y; let worldX = clickX - centerX; let worldZ = clickY - centerY; const cosH = Math.cos(playerHeading); const sinH = Math.sin(playerHeading); let rotatedX = worldX * cosH - worldZ * sinH; let rotatedZ = worldX * sinH + worldZ * cosH; worldX = rotatedX / mapScale + player.position.x; worldZ = -rotatedZ / mapScale + player.position.z; waypoint = new THREE.Vector3(worldX, 0, worldZ);
        
        if (!waypointMarker) {
                // Create the marker if it doesn't exist
                const markerGeometry = new THREE.CylinderGeometry(15, 15, 3000, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00FFFF, // Cyan color
                    transparent: true,
                    opacity: 0.5,
                    depthWrite: false // Prevents it from hiding objects behind it
                });
                waypointMarker = new THREE.Mesh(markerGeometry, markerMaterial);
                scene.add(waypointMarker);
            }
            // Move the marker to the new waypoint position
            waypointMarker.position.set(waypoint.x, 1500, waypoint.z);
        
        }
        
        function clearWaypoint() {
            waypoint = null;
            
            // --- THIS IS THE NEW CODE ---
            if (waypointMarker) {
                scene.remove(waypointMarker);
                waypointMarker.geometry.dispose();
                waypointMarker.material.dispose();
                waypointMarker = null;
            }
        }
        
        
        function resizeMapCanvases() { const container = mapContainer; const isFullscreen = container.classList.contains('fullscreen'); let newSize; if (isFullscreen) newSize = Math.min(window.innerWidth, window.innerHeight) * 0.9; else newSize = container.offsetWidth; mapCanvas.width = newSize; mapCanvas.height = newSize; mapOverlayCanvas.width = newSize; mapOverlayCanvas.height = newSize; if (isFullscreen) { const left = `calc(50% - ${newSize / 2}px)`; const top = `calc(50% - ${newSize / 2}px)`; mapCanvas.style.left = left; mapCanvas.style.top = top; mapOverlayCanvas.style.left = left; mapOverlayCanvas.style.top = top; } else { mapCanvas.style.left = '0'; mapCanvas.style.top = '0'; mapOverlayCanvas.style.left = '0'; mapOverlayCanvas.style.top = '0'; } mapScale = isFullscreen ? FULLSCREEN_MAP_SCALE : MINIMAP_SCALE; }
        function drawMap(playerHeading) { const mapCtx = mapCanvas.getContext('2d'); const isFullscreen = mapContainer.classList.contains('fullscreen'); mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height); mapCtx.save(); const centerX = mapCanvas.width / 2; const centerY = mapCanvas.height / 2; mapCtx.translate(centerX, centerY); mapCtx.rotate(-playerHeading); mapCtx.scale(mapScale, mapScale); mapCtx.translate(-player.position.x, player.position.z); if (isFullscreen) { const visibleWorldWidth = mapCanvas.width / mapScale; const minChunkX = Math.floor((player.position.x - visibleWorldWidth / 2) / chunkSize); const maxChunkX = Math.ceil((player.position.x + visibleWorldWidth / 2) / chunkSize); const minChunkZ = Math.floor((player.position.z - visibleWorldWidth / 2) / chunkSize); const maxChunkZ = Math.ceil((player.position.z + visibleWorldWidth / 2) / chunkSize); for (let x = minChunkX; x <= maxChunkX; x++) { for (let z = minChunkZ; z <= maxChunkZ; z++) { const seed = (x * 1000 + z).toString(); const random = new Math.seedrandom(seed); let chunkType = 'scattered'; if (random() < airportDensity) chunkType = 'airport'; else if (random() < cityDensity) chunkType = 'city'; if (chunkType === 'airport') mapCtx.fillStyle = '#444444'; else if (chunkType === 'city') mapCtx.fillStyle = '#4682B4'; else mapCtx.fillStyle = '#6B8E23'; mapCtx.fillRect(x * chunkSize - chunkSize / 2, z * chunkSize - chunkSize / 2, chunkSize, chunkSize); } } const airportSearchRadius = 50; const playerChunkX = Math.floor(player.position.x / chunkSize); const playerChunkZ = Math.floor(player.position.z / chunkSize); mapCtx.font = `bold ${24 / mapScale}px Inter`; mapCtx.fillStyle = 'white'; mapCtx.textAlign = 'center'; mapCtx.textBaseline = 'middle'; for (let x = playerChunkX - airportSearchRadius; x <= playerChunkX + airportSearchRadius; x++) { for (let z = playerChunkZ - airportSearchRadius; z <= playerChunkZ + airportSearchRadius; z++) { const seed = (x * 1000 + z).toString(); const random = new Math.seedrandom(seed); if (random() < airportDensity) { const airportX = x * chunkSize, airportZ = z * chunkSize; mapCtx.save(); mapCtx.translate(airportX, airportZ); mapCtx.rotate(playerHeading); mapCtx.shadowColor = 'black'; mapCtx.shadowBlur = 10; mapCtx.fillText('✈️', 0, 0); mapCtx.restore(); } } } mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; mapCtx.lineWidth = 4 / mapScale; activeChunks.forEach(chunkData => { const chunkPos = chunkData.group.position; mapCtx.strokeRect(chunkPos.x - chunkSize / 2, chunkPos.z - chunkSize / 2, chunkSize, chunkSize); }); } else { activeChunks.forEach(chunkData => { const chunkPos = chunkData.group.position; let color = '#6B8E23'; if (chunkData.type === 'airport') color = '#444444'; else if (chunkData.type === 'city') color = '#4682B4'; mapCtx.fillStyle = color; mapCtx.fillRect(chunkPos.x - chunkSize / 2, chunkPos.z - chunkSize / 2, chunkSize, chunkSize); }); } if (waypoint) { mapCtx.save(); mapCtx.translate(waypoint.x, waypoint.z); mapCtx.rotate(playerHeading); mapCtx.fillStyle = '#00FFFF'; mapCtx.strokeStyle = 'black'; mapCtx.lineWidth = 4 / mapScale; mapCtx.shadowColor = '#00FFFF'; mapCtx.shadowBlur = 20; const markerSize = 10 / mapScale; mapCtx.beginPath(); mapCtx.moveTo(0, -markerSize * 1.5); mapCtx.lineTo(markerSize, markerSize); mapCtx.lineTo(-markerSize, markerSize); mapCtx.closePath(); mapCtx.fill(); mapCtx.stroke(); mapCtx.restore(); } mapCtx.restore(); }
        function drawMapOverlay(playerHeading) { const mapOverlayCtx = mapOverlayCanvas.getContext('2d'); mapOverlayCtx.clearRect(0, 0, mapOverlayCanvas.width, mapOverlayCanvas.height); const centerX = mapOverlayCanvas.width / 2, centerY = mapOverlayCanvas.height / 2, isFullscreen = mapContainer.classList.contains('fullscreen'); mapOverlayCtx.save(); mapOverlayCtx.translate(centerX, centerY); mapOverlayCtx.shadowColor = '#00FF00'; mapOverlayCtx.shadowBlur = 15; mapOverlayCtx.fillStyle = '#00FF00'; const arrowSize = centerX * 0.08; mapOverlayCtx.beginPath(); mapOverlayCtx.moveTo(0, -arrowSize * 1.5); mapOverlayCtx.lineTo(arrowSize, arrowSize); mapOverlayCtx.lineTo(-arrowSize, arrowSize); mapOverlayCtx.closePath(); mapOverlayCtx.fill(); mapOverlayCtx.restore(); mapOverlayCtx.save(); mapOverlayCtx.translate(centerX, centerY); mapOverlayCtx.rotate(-playerHeading); const compassRadius = centerX * 0.95; mapOverlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; mapOverlayCtx.lineWidth = 2; for (let i = 0; i < 36; i++) { const angle = (i * 10) * Math.PI / 180; const isMajorTick = i % 9 === 0; const tickLength = isMajorTick ? compassRadius * 0.15 : compassRadius * 0.07; mapOverlayCtx.beginPath(); mapOverlayCtx.moveTo(Math.sin(angle) * (compassRadius - tickLength), -Math.cos(angle) * (compassRadius - tickLength)); mapOverlayCtx.lineTo(Math.sin(angle) * compassRadius, -Math.cos(angle) * compassRadius); mapOverlayCtx.stroke(); } mapOverlayCtx.font = `bold ${compassRadius * 0.15}px Inter`; mapOverlayCtx.fillStyle = 'white'; mapOverlayCtx.textAlign = 'center'; mapOverlayCtx.textBaseline = 'middle'; const directions = { 'N': 0, 'E': 90, 'S': 180, 'W': 270 }; for (const [label, angleDeg] of Object.entries(directions)) { const angle = angleDeg * Math.PI / 180; const x = Math.sin(angle) * (compassRadius * 0.75); const y = -Math.cos(angle) * (compassRadius * 0.75); mapOverlayCtx.save(); mapOverlayCtx.translate(x, y); mapOverlayCtx.rotate(playerHeading); mapOverlayCtx.fillText(label, 0, 0); mapOverlayCtx.restore(); } mapOverlayCtx.restore(); if (isFullscreen) { mapOverlayCtx.font = '16px Inter'; mapOverlayCtx.fillStyle = 'white'; mapOverlayCtx.textAlign = 'left'; mapOverlayCtx.fillText(`X: ${player.position.x.toFixed(0)}`, 20, 30); mapOverlayCtx.fillText(`Z: ${player.position.z.toFixed(0)}`, 20, 50); const heading = (THREE.MathUtils.radToDeg(playerHeading) + 360) % 360; mapOverlayCtx.textAlign = 'right'; mapOverlayCtx.fillText(`HDG: ${heading.toFixed(0)}°`, mapOverlayCanvas.width - 20, 30); } }

        // --- Physics & Animation Loop ---
        const thrustPower = 0.02; const reverseThrustPower = -0.02; const pitchControlSpeed = 0.0008; const rollControlSpeed = 0.0015; const yawControlSpeed = 0.002; const groundYawSpeed = 0.005; const gravity = new THREE.Vector3(0, -0.002, 0); const liftCoefficient = 0.00012; const dragCoefficient = 0.00002; const maxVelocityMagnitude = 0.8; const maxPitchAngularVelocity = 0.02; const maxRollAngularVelocity = 0.025; const maxYawAngularVelocity = 0.01; const crashImpactThreshold = -0.15; const crashRollThreshold = Math.PI / 4; const maxBrakeForce = 0.05;
        let startTime = performance.now();
                            function animate(currentTime) {
            requestAnimationFrame(animate);
            updateAircraftLights(); 
            updateDayNightCycle();
            const deltaTime = 1;
            const groundLevel = 0.8 + 2.5;
            const isOnGround = player.position.y <= groundLevel + 0.1;
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(player.quaternion);
            let thrustForceMagnitude = 0;
            if (keys['w']) thrustForceMagnitude = thrustPower; else if (keys['s']) thrustForceMagnitude = reverseThrustPower;
            const thrustForce = forward.clone().multiplyScalar(thrustForceMagnitude);
            const speedSq = playerVelocity.lengthSq();
            const horizontalForward = forward.clone().setY(0).normalize();
            const dotProduct = forward.dot(horizontalForward);
            let pitchAngle = Math.acos(Math.min(1, Math.max(-1, dotProduct)));
            let liftAmount = liftCoefficient * speedSq * Math.cos(pitchAngle);
            if (flapsExtended > 0) liftAmount *= 1.2 + flapsExtended * 0.3;
            const liftForce = up.clone().multiplyScalar(liftAmount);
            let additionalDrag = 0;
            if (flapsExtended > 0) additionalDrag += 0.0001 * flapsExtended;
            if (gearExtended) additionalDrag += 0.0002;
            if (isBraking && isOnGround) {
                const speedFactor = Math.min(1, playerVelocity.length() / 0.5);
                brakeForce = Math.min(brakeForce + 0.001 * speedFactor, maxBrakeForce * speedFactor);
                const brakeDirection = playerVelocity.clone().setY(0).normalize();
                const brakeEffect = brakeDirection.multiplyScalar(-brakeForce);
                playerVelocity.add(brakeEffect);
                if (playerVelocity.dot(brakeDirection) < 0) playerVelocity.add(brakeDirection.multiplyScalar(playerVelocity.dot(brakeDirection)));
                brakesDisplay.style.color = (Date.now() % 100 < 50) ? '#ff0000' : '#FFD700';
            } else { brakeForce = Math.max(brakeForce - 0.002, 0); brakesDisplay.style.color = '#FFD700'; }
            const dragForce = playerVelocity.clone().normalize().multiplyScalar(-(dragCoefficient + additionalDrag) * speedSq);
            const totalForce = new THREE.Vector3().add(gravity).add(thrustForce).add(dragForce);
            if (!isOnGround) totalForce.add(liftForce);
            playerVelocity.add(totalForce.clone().multiplyScalar(deltaTime));
            if (playerVelocity.length() > maxVelocityMagnitude) playerVelocity.setLength(maxVelocityMagnitude);
            playerAngularVelocity.multiplyScalar(0.95);
            const playerEuler = new THREE.Euler().setFromQuaternion(player.quaternion, 'YXZ');
            if (keys['q']) playerAngularVelocity.x -= pitchControlSpeed;
            if (keys['e']) playerAngularVelocity.x += pitchControlSpeed;
            if (isOnGround) {
                if (keys['a']) playerAngularVelocity.y += groundYawSpeed;
                if (keys['d']) playerAngularVelocity.y -= groundYawSpeed;
                playerAngularVelocity.z = 0;
                if (Math.abs(playerEuler.z) > crashRollThreshold) { resetPlayer(); return; }
            } else {
                if (keys['a']) playerAngularVelocity.z += rollControlSpeed;
                if (keys['d']) playerAngularVelocity.z -= rollControlSpeed;
                const rollAngle = playerEuler.z;
                const coordinatedYawForce = rollAngle * yawControlSpeed * playerVelocity.length();
                playerAngularVelocity.y += coordinatedYawForce;
            }
            playerAngularVelocity.x = Math.max(-maxPitchAngularVelocity, Math.min(maxPitchAngularVelocity, playerAngularVelocity.x));
            playerAngularVelocity.y = Math.max(-maxYawAngularVelocity, Math.min(maxYawAngularVelocity, playerAngularVelocity.y));
            playerAngularVelocity.z = Math.max(-maxRollAngularVelocity, Math.min(maxRollAngularVelocity, playerAngularVelocity.z));
            const deltaRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(playerAngularVelocity.x, playerAngularVelocity.y, playerAngularVelocity.z, 'YXZ'));
            player.quaternion.multiply(deltaRotation);
            player.position.add(playerVelocity.clone().multiplyScalar(deltaTime));
            if (player.position.y < groundLevel) {
                if (playerVelocity.y < crashImpactThreshold) { resetPlayer(); return; }
                player.position.y = groundLevel;
                if (playerVelocity.y < 0) playerVelocity.y = 0;
                const horizontalVelocity = playerVelocity.clone().setY(0);
                if (horizontalVelocity.length() > 0.005) { horizontalVelocity.multiplyScalar(isBraking ? 0.92 : 0.98); playerVelocity.x = horizontalVelocity.x; playerVelocity.z = horizontalVelocity.z; }
                else { playerVelocity.x = 0; playerVelocity.z = 0; playerAngularVelocity.set(0, 0, 0); }
            }
            updateControlSurfaces();

          // --- REPLACE YOUR EXISTING CAMERA LOGIC WITH THIS ---
            const activeCamera = isCockpitView ? cockpitCamera : mainCamera;
            if (isCockpitView) {
                if (isLookingAround) {
                    cockpitCamera.rotation.y = Math.PI - cameraYaw; 
                    cockpitCamera.rotation.x = -cameraPitch;
                } else {
                    cockpitCamera.rotation.set(0, Math.PI, 0); 
                    cameraYaw = 0;
                    cameraPitch = 0;
                }
            } else {
                // In chase view, use the dynamic chaseCameraDistance for the offset
                const offset = new THREE.Vector3(0, 10, -chaseCameraDistance); // Use the variable here
                
                if (isLookingAround) {
                    const cameraQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ'));
                    offset.applyQuaternion(cameraQuaternion);
                } else {
                    offset.applyQuaternion(player.quaternion);
                }
                mainCamera.position.copy(player.position).add(offset);
                mainCamera.lookAt(player.position);
            }

            updateChunks();
            const finalPlayerEuler = new THREE.Euler().setFromQuaternion(player.quaternion, 'YXZ');
            drawMap(finalPlayerEuler.y);
            drawMapOverlay(finalPlayerEuler.y);
            const waypointHud = document.getElementById('waypoint-hud');
            if (waypoint) {
                waypointHud.style.display = 'block';
                const playerPos2D = new THREE.Vector2(player.position.x, player.position.z);
                const waypointPos2D = new THREE.Vector2(waypoint.x, waypoint.z);
                const distance = playerPos2D.distanceTo(waypointPos2D) / 1000;
                const bearing = Math.atan2(waypoint.x - player.position.x, -(waypoint.z - player.position.z));
                let angleDiff = THREE.MathUtils.radToDeg(bearing - finalPlayerEuler.y);
                angleDiff = (angleDiff + 540) % 360 - 180;
                const direction = angleDiff < -5 ? '←' : (angleDiff > 5 ? '→' : '•');
                document.getElementById('waypoint-info').textContent = `${distance.toFixed(1)} km ${direction} ${Math.abs(angleDiff).toFixed(0)}°`;
            } else {
                waypointHud.style.display = 'none';
            }
            speedDisplay.textContent = (playerVelocity.length() * 3.6 * 100).toFixed(1);
            altitudeDisplay.textContent = Math.max(0, (player.position.y - groundLevel)).toFixed(1);
            pitchDisplay.textContent = THREE.MathUtils.radToDeg(finalPlayerEuler.x).toFixed(1);
            rollDisplay.textContent = THREE.MathUtils.radToDeg(finalPlayerEuler.z).toFixed(1);
            headingDisplay.textContent = ((THREE.MathUtils.radToDeg(finalPlayerEuler.y) + 360) % 360).toFixed(1);
            const totalSeconds = Math.floor((performance.now() - startTime) / 1000);
            timeDisplay.textContent = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
            
            renderer.render(scene, activeCamera);
        }
        function updateControlSurfaces() {
            const rollInput = keys['a'] ? 1 : (keys['d'] ? -1 : 0);
            player.controlSurfaces.leftAileron.rotation.x = -rollInput * 0.3;
            player.controlSurfaces.rightAileron.rotation.x = rollInput * 0.3;
            const pitchInput = keys['q'] ? -1 : (keys['e'] ? 1 : 0);
            player.controlSurfaces.leftElevator.rotation.x = pitchInput * 0.3;
            player.controlSurfaces.rightElevator.rotation.x = pitchInput * 0.3;
            const yawInput = keys['a'] ? 0.3 : (keys['d'] ? -0.3 : 0);
            player.controlSurfaces.rudder.rotation.y = yawInput;
            player.controlSurfaces.leftFlap.rotation.x = -flapsExtended * 0.5;
            player.controlSurfaces.rightFlap.rotation.x = -flapsExtended * 0.5;
            const gearTargetY = gearExtended ? -2.5 : 1, strutTargetY = gearTargetY + 1;
            player.controlSurfaces.frontWheel.position.y += (gearTargetY - player.controlSurfaces.frontWheel.position.y) * 0.1;
            player.controlSurfaces.leftWheel.position.y += (gearTargetY - player.controlSurfaces.leftWheel.position.y) * 0.1;
            player.controlSurfaces.rightWheel.position.y += (gearTargetY - player.controlSurfaces.rightWheel.position.y) * 0.1;
            player.controlSurfaces.frontStrut.position.y += (strutTargetY - player.controlSurfaces.frontStrut.position.y) * 0.1;
            player.controlSurfaces.leftStrut.position.y += (strutTargetY - player.controlSurfaces.leftStrut.position.y) * 0.1;
            player.controlSurfaces.rightStrut.position.y += (strutTargetY - player.controlSurfaces.rightStrut.position.y) * 0.1;
            player.controlSurfaces.leftGearDoor.rotation.x = gearExtended ? 0 : Math.PI/2;
            player.controlSurfaces.rightGearDoor.rotation.x = gearExtended ? 0 : Math.PI/2;
            player.controlSurfaces.noseGearDoor.rotation.x = gearExtended ? 0 : Math.PI/2;
        }

        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            cockpitCamera.aspect = aspect;
            cockpitCamera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            resizeMapCanvases();
        });
