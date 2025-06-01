/**
 * 3D Book Effect for Rust Universe Book Landing Page
 * Professional, elegant book visualization
 */

document.addEventListener("DOMContentLoaded", function () {
  // Initialize 3D book only if Three.js is available
  if (typeof THREE !== "undefined") {
    initBook3D();
  }

  // Ensure the fallback cover is visible
  const fallbackCover = document.querySelector(".fallback-cover");
  if (fallbackCover) {
    fallbackCover.style.display = "block";
  }
});

function initBook3D() {
  const container = document.getElementById("book-3d-container");
  if (!container) return;

  // Get the cover image for texture
  const coverImage = document.getElementById("book-cover-image");
  if (!coverImage) return;

  // Setup scene
  const scene = new THREE.Scene();
  scene.background = null; // Transparent background

  // Setup camera
  const camera = new THREE.PerspectiveCamera(
    70,
    container.offsetWidth / container.offsetHeight,
    0.1,
    1000
  );
  camera.position.z = 4;
  camera.position.y = 0.2;
  camera.position.x = 0.3;
  camera.lookAt(0, 0, 0);

  // Setup renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setClearColor(0x000000, 0); // Transparent
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Add lighting
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Main directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Spotlight for dramatic effect
  const spotlight = new THREE.SpotLight(0xf97316, 0.8);
  spotlight.position.set(3, 5, 3);
  spotlight.angle = Math.PI / 6;
  spotlight.penumbra = 0.3;
  spotlight.castShadow = true;
  scene.add(spotlight);

  // Create book materials
  // Front cover (using the actual book cover image)
  const textureLoader = new THREE.TextureLoader();
  const coverTexture = textureLoader.load(
    "compressed-assets/rust-universe-cover.png"
  );

  // Enhance texture settings
  coverTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  coverTexture.minFilter = THREE.LinearFilter;
  coverTexture.magFilter = THREE.LinearFilter;

  // Create materials for the book
  const frontMaterial = new THREE.MeshStandardMaterial({
    map: coverTexture,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Back cover
  const backMaterial = new THREE.MeshStandardMaterial({
    color: 0xe84c17,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Spine material
  const spineMaterial = new THREE.MeshStandardMaterial({
    color: 0xe84c17,
    roughness: 0.4,
    metalness: 0.15,
  });

  // Page material
  const pageMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.9,
    metalness: 0,
  });

  // Create book geometry
  const bookWidth = 2.2;
  const bookHeight = 3;
  const bookDepth = 0.4;
  const bookGeometry = new THREE.BoxGeometry(
    bookWidth,
    bookHeight,
    bookDepth,
    2,
    2,
    2
  );

  // Apply materials to each face of the book
  // Order: right, left, top, bottom, front, back
  const bookMaterials = [
    spineMaterial, // Right side (spine)
    pageMaterial, // Left side (pages)
    pageMaterial, // Top (pages)
    pageMaterial, // Bottom (pages)
    frontMaterial, // Front (cover)
    backMaterial, // Back
  ];

  // Create book mesh
  const book = new THREE.Mesh(bookGeometry, bookMaterials);
  book.castShadow = true;
  book.receiveShadow = true;
  scene.add(book);

  // Initial rotation
  book.rotation.y = -0.3;
  book.rotation.x = 0.1;
  book.rotation.z = 0.02;

  // Add page detail
  const pageGeometry = new THREE.PlaneGeometry(
    bookWidth - 0.05,
    bookHeight - 0.05,
    1,
    1
  );
  const pageMesh = new THREE.Mesh(pageGeometry, pageMaterial);
  pageMesh.position.set(0, 0, bookDepth / 2 + 0.001);
  pageMesh.rotation.x = Math.PI;
  pageMesh.castShadow = true;
  pageMesh.receiveShadow = true;
  book.add(pageMesh);

  // Add shadow plane beneath the book
  const shadowPlane = new THREE.PlaneGeometry(
    bookWidth * 1.5,
    bookHeight * 0.7,
    1,
    1
  );
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowPlane, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -bookHeight / 2 - 0.2;
  scene.add(shadow);

  // Mouse interaction state
  let isHovering = false;
  let targetRotationY = -0.3;
  let targetRotationX = 0.1;
  let targetRotationZ = 0.02;

  // Mouse interaction
  container.addEventListener("mousemove", (e) => {
    if (!isHovering) return;

    // Calculate mouse position relative to the container
    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Update target rotation based on mouse position
    targetRotationY = mouseX * 0.5;
    targetRotationX = mouseY * 0.3;
    targetRotationZ = mouseX * 0.05;
  });

  container.addEventListener("mouseenter", () => {
    isHovering = true;
  });

  container.addEventListener("mouseleave", () => {
    isHovering = false;
    // Reset to default position when mouse leaves
    targetRotationY = -0.3;
    targetRotationX = 0.1;
    targetRotationZ = 0.02;
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
  });

  // Animation loop
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);

    // Increment time for floating effect
    time += 0.01;

    // Smooth rotation animation
    book.rotation.y += (targetRotationY - book.rotation.y) * 0.1;
    book.rotation.x += (targetRotationX - book.rotation.x) * 0.1;
    book.rotation.z += (targetRotationZ - book.rotation.z) * 0.1;

    // Subtle floating effect
    book.position.y = Math.sin(time) * 0.05;

    // Update shadow position to match book
    shadow.position.x = book.position.x;

    // Render the scene
    renderer.render(scene, camera);
  }

  animate();

  // Click to flip
  let isFlipping = false;
  container.addEventListener("click", () => {
    if (isFlipping) return;

    isFlipping = true;
    const currentRotationY = book.rotation.y;

    // Determine flip direction
    const targetY = currentRotationY < 0 ? Math.PI : -0.3;

    // Animate flip
    const duration = 1000; // ms
    const startTime = Date.now();

    function flipAnimation() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease in-out cubic
      const t =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate rotation
      book.rotation.y = currentRotationY + (targetY - currentRotationY) * t;

      // Add some z-axis wobble during flip
      book.rotation.z = Math.sin(progress * Math.PI) * 0.1;

      if (progress < 1) {
        requestAnimationFrame(flipAnimation);
      } else {
        isFlipping = false;
        book.rotation.z = 0;
      }
    }

    flipAnimation();
  });
}
