# Website Architecture & Development Guide

This document provides a comprehensive overview of the portfolio website's architecture, key systems, and component implementation. It serves as a guide for recreating or modifying the website.

## 1. Tech Stack & Dependencies

**Core Frameworks:**
- **React (v18)**: UI Library.
- **Vite**: Build tool and development server.
- **TypeScript**: Static typing.

**3D & Graphics:**
- **Three.js**: Core 3D library.
- **@react-three/fiber (R3F)**: React renderer for Three.js.
- **@react-three/drei**: Helpers for R3F (Environment, etc.).
- **@react-three/rapier**: 3D Physics engine (used in Tech Stack section).
- **@react-three/postprocessing**: Post-processing effects (AO, etc.).

**Animation & Interactions:**
- **GSAP (GreenSock Animation Platform)**: Advanced animations and ScrollTrigger.
- **gsap-trial**: Likely used for specific plugins like SplitText (note: check licensing).
- **react-fast-marquee**: Infinite scrolling text.

**Styling:**
- **CSS Modules/Global CSS**: Standard CSS with variables.
- **React Icons**: Icon library.

## 2. Project Structure

```
src/
├── components/          # UI and 3D Components
│   ├── Character/       # 3D Character Logic (Scene, Utils)
│   ├── styles/          # Component-specific CSS
│   ├── utils/           # Shared utilities (SplitText, etc.)
│   └── [Sections].tsx   # Main Page Sections (Landing, Work, etc.)
├── context/             # React Context (LoadingProvider)
├── assets/              # Static assets imports
├── App.tsx              # Application Root & Suspense Setup
└── main.tsx             # Entry Point
```

## 3. Core Systems Architecture

### A. 3D Character System (`src/components/Character/`)
The website features an interactive 3D character that responds to scroll and mouse movement.

1.  **Scene Setup (`Scene.tsx`)**:
    -   Initializes a raw `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
    -   **Important**: Uses a hybrid approach—managing the Three.js scene imperatively within a `useEffect` rather than purely declaratively with `@react-three/fiber` (except for `TechStack`).
    -   Handles window resizing and cleanup.

2.  **Lighting (`utils/lighting.ts`)**:
    -   **Environment**: Uses `RGBELoader` to load an HDR map (`char_enviorment.hdr`) for realistic reflections.
    -   **Dynamic Lights**:
        -   Directional Light for main shadows.
        -   Point Light linked to the character's monitor screen: When the screen glows (emissive material), the point light intensity increases, creating a realistic glow effect on the face.
    -   **Animation**: GSAP controls the initial fade-in of lights (`turnOnLights`).

3.  **Model Loading & Security (`utils/character.ts` & `utils/decrypt.ts`)**:
    -   **Encryption**: The GLTF model is stored as an encrypted file (`.enc`) to prevent easy theft.
    -   **Decryption**: Uses Web Crypto API (`AES-CBC`) to decrypt the model blob on the fly before loading.
    -   **Loading**: Uses `GLTFLoader` with `DRACOLoader` for compression.

4.  **Advanced Animation Control (`utils/animationUtils.ts`)**:
    -   **Bone Filtering**: The system extracts specific bones (e.g., eyebrows, typing fingers) to create isolated animation actions. This allows mixing a base animation (idle/sitting) with specific actions (typing, raising eyebrows) without conflict.
    -   **Interaction**: Hovering over the character triggers the "browup" animation.
    -   **Mixer**: Manages the `introAnimation`, blinking, and typing loops.

5.  **Scroll Integration (`utils/GsapScroll.ts`)**:
    -   Orchestrates complex timelines linking scroll position (`ScrollTrigger`) to 3D properties.
    -   **Features**:
        -   Rotates character based on scroll section.
        -   Moves camera position for cinematic transitions.
        -   Toggles visibility of props (Monitor, Lights).
        -   Synchronizes HTML element animations (text fade-ins) with 3D movements.

4.  **Interaction (`utils/mouseUtils.ts`)**:
    -   Tracks mouse/touch position.
    -   Rotates the character's head bone (`spine006`) to look at the cursor using linear interpolation (Lerp) for smoothness.

### B. Layout & Orchestration (`MainContainer.tsx`)
-   **Responsive Logic**: Detects mobile vs. desktop (`window.innerWidth > 1024`).
-   **Layout Structure**:
    -   `Navbar` & `SocialIcons`: Fixed overlay elements.
    -   `Smooth Wrapper`: A div structure setup for GSAP's smooth scrolling (if implemented) or just structural containment.
    -   **Lazy Loading**: Most heavy components (Character, TechStack) are lazy-loaded with `Suspense`.

### C. Physics-Based Tech Stack (`TechStack.tsx`)
-   **Implementation**: Unlike the main character scene, this uses **@react-three/fiber** and **@react-three/rapier**.
-   **Logic**:
    -   Creates a physical "box" where spheres (representing skills) bounce around.
    -   **Interaction**: A "Pointer" rigid body follows the mouse, pushing spheres away.
    -   **Activation**: Physics simulation only runs when the section is in view (performance optimization).

### D. Horizontal Scroll Section (`Work.tsx`)
-   **Technique**: Uses GSAP ScrollTrigger with `pin: true`.
-   **Calculation**:
    -   Calculates total width of the horizontal container.
    -   Translates the container on the X-axis as the user scrolls vertically.
    -   `end: "+=${translateX}"` ensures the vertical scroll length matches the horizontal content width.

## 4. Key Implementation Details

### Custom Loading System (`context/LoadingProvider.tsx`)
-   Global context tracking loading percentage.
-   Used by 3D loaders to report progress.
-   Blocks the main UI until assets are ready.

### Styling Strategy (`index.css`)
-   **Variables**:
    -   `--accentColor`: #c2a4ff (Purple).
    -   `--backgroundColor`: #0b080c (Dark).
-   **Typography**: "Geist" font family.
-   **Global Reset**: Handles basic resets and scroll behavior.

### Interactive "What I Do" Section (`WhatIDo.tsx`)
-   **Concept**: Split panel design (Develop vs. Design).
-   **Interaction**:
    -   Clicking a panel expands it and collapses the sibling.
    -   Uses direct DOM manipulation via refs for class toggling (`what-content-active`, `what-sibling`).
    -   SVG lines for decorative borders.

### Custom Cursor System (`Cursor.tsx`)
-   **Implementation**: A custom `div` element tracking mouse movement.
-   **Animation**: Uses `requestAnimationFrame` and GSAP for smooth interpolation (lag effect) between the actual mouse position and the cursor element.
-   **Interactivity**:
    -   Listens for hover events on elements with `data-cursor` attributes.
    -   `data-cursor="icons"`: Snaps to the element (used in Social Icons).
    -   `data-cursor="disable"`: Changes style or hides (used in Contact links).

### Career & Timeline (`Career.tsx`)
-   **Structure**: A vertical list of timeline items.
-   **Animation (`setAllTimeline` in `GsapScroll.ts`)**:
    -   Animate height of the timeline line (`.career-timeline`) from 0 to 100%.
    -   Staggered fade-in for info boxes.
    -   Controls the "pulsing" animation of the timeline dots.

### Contact Section (`Contact.tsx`)
-   **Layout**: Grid/Flex layout displaying Email, Phone, and Social Links.
-   **Icons**: Uses `react-icons` (Material Design icons).
-   **Footer**: Includes copyright and "Designed by" credit.

### Navigation & Smooth Scroll (`Navbar.tsx`)
-   **Library**: Uses `ScrollSmoother` (GSAP Plugin) for the global smooth scrolling effect.
-   **Structure**: Requires a wrapper (`#smooth-wrapper`) and content div (`#smooth-content`) wrapping the entire application in `MainContainer`.
-   **Navigation**: Intercepts anchor link clicks to use `smoother.scrollTo()` for smooth programmatic scrolling to sections.

### Text Animations (`utils/initialFX.ts` & `utils/splitText.ts`)
-   **Initial Load (`initialFX`)**:
    -   Triggers after the 3D character is loaded.
    -   Unlocks body scroll.
    -   Animates the "Hello! I'm MONCY" text using `SplitText` (staggered char reveal).
    -   Sets up infinite looping text for the "Designer/Developer" subtitles.
-   **Scroll Reveal (`splitText`)**:
    -   Target classes: `.para` (paragraphs) and `.title` (headings).
    -   **Mechanism**: Splits text into lines/words/chars.
    -   **Trigger**: Animate `y` and `opacity` when the element enters the viewport using `ScrollTrigger`.

### Social Icons (`SocialIcons.tsx`)
-   **Magnetic Effect**:
    -   Custom implementation tracking mouse position relative to the icon center.
    -   Updates CSS variables (`--siLeft`, `--siTop`) to slightly move the icon towards the cursor, creating a "magnetic" feel.
    -   Uses `requestAnimationFrame` for performance.

### Loading Screen (`Loading.tsx`)
-   **Simulation**: Uses a `setProgress` utility to simulate realistic loading progression (randomized increments) combined with actual asset loading.
-   **Visuals**:
    -   **Marquee**: Uses `react-fast-marquee` for scrolling background text.
    -   **Loader Game**: A decorative element with lines and a ball.
-   **Transition**: Once loaded (100%), it dynamically imports and triggers `initialFX` to start the site intro animations.

### Utility Components
-   **`HoverLinks.tsx`**: Creates a text-rolling effect on hover by rendering the text twice (once normally, once inside a hidden/translated div) and animating via CSS.
-   **`WorkImage.tsx`**:
    -   Handles project thumbnails.
    -   **Video Preview**: Fetches video assets as Blobs on hover for instant playback without pre-loading everything.
    -   **Link**: Displays an external link icon.

### Data & Configuration (`data/boneData.ts`)
-   **Separation of Concerns**: Bone names for complex 3D rigs are stored in a separate data file.
-   **Usage**: Arrays like `typingBoneNames` and `eyebrowBoneNames` are imported by `animationUtils.ts` to filter animations, ensuring only specific parts of the model move during specific actions (e.g., only moving fingers when typing, not the whole body).

### Global Styling (`App.css` & `index.css`)
-   **`App.css`**: Defines the responsive container widths (`.section-container`) across different breakpoints (1600px, 1400px, 900px).
-   **Performance**: Uses `transform: translateZ(0)` and `will-change` hints on text elements to promote them to their own compositor layers, preventing repaint issues during scroll animations.

## 6. Public Assets & Workflow

To replicate the `public/` folder setup, you need the following:

### A. Draco Decoder (`public/draco/`)
These files are required by `DRACOLoader` to decompress 3D models.
-   **Files**: `draco_decoder.js`, `draco_decoder.wasm`.
-   **Source**: You can copy these from `node_modules/three/examples/jsm/libs/draco/gltf/` after installing Three.js, or download them from the [Google Draco repository](https://github.com/google/draco).

### B. 3D Models & Encryption (`public/models/`)
The site uses a custom encryption workflow for the 3D character.

1.  **Environment Map (`char_enviorment.hdr`)**:
    -   An HDRI file used for realistic lighting and reflections.
    -   **Action**: Download an HDR image from [Poly Haven](https://polyhaven.com/hdris) or similar sites.

2.  **Character Model Workflow**:
    -   **Source**: You need a 3D model (e.g., `character.glb`) exported from Blender.
    -   **Encryption Script (`public/models/encrypt.cjs`)**:
        -   Run `node public/models/encrypt.cjs` to encrypt your `.glb` file.
        -   This script uses the password `"Character3D#@"` (hardcoded in the script and `src/components/Character/utils/decrypt.ts`).
        -   **Output**: Generates `character.enc`, which is the file actually loaded by the website.

### C. Images (`public/images/`)
-   Standard `.webp` images used for the Tech Stack spheres and project thumbnails.
-   **Action**: Replace these with your own technology icons and project screenshots.

## 5. Re-creation Guide / Checklist

If you are building a similar site, follow these steps:

1.  **Setup**:
    -   Initialize Vite + React + TypeScript.
    -   Install dependencies (`three`, `gsap`, `@react-three/fiber`, etc.).

2.  **Asset Preparation**:
    -   Compress 3D models (Draco).
    -   (Optional) Encrypt models if IP protection is needed.
    -   Optimize images to WebP.

3.  **Core Skeleton**:
    -   Create `LoadingContext`.
    -   Build `MainContainer` with responsive checks.
    -   Implement the `Scene` component for the persistent 3D character.

4.  **Animation Integration**:
    -   Set up GSAP globally.
    -   Create the `GsapScroll` utility to map ScrollTriggers to 3D object properties.
    -   **Tip**: Debug scroll animations by adding `markers: true` to ScrollTrigger configurations.

5.  **Section Implementation**:
    -   **Hero**: Standard HTML/CSS with split-text animations.
    -   **Work**: Implement the horizontal scroll logic using `pin`.
    -   **TechStack**: Create the R3F canvas with Rapier physics.

6.  **Optimization**:
    -   Use `React.lazy` for heavy 3D components.
    -   Ensure `useEffect` cleanup functions remove event listeners and dispose of Three.js renderers.
