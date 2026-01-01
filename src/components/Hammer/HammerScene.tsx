import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLoading } from "../../context/LoadingProvider";
import { setProgress } from "../Loading";
import { setAllTimeline, setPageScrollAnimations } from "../utils/GsapScroll";

gsap.registerPlugin(ScrollTrigger);

const Lightning = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create pool of bolts using TubeGeometry for thickness
  const bolts = useMemo(() => {
    return new Array(5).fill(0).map(() => {
      // Random points for each bolt
      const points = [];
      const segments = 8;
      let x = 0, y = 1.2, z = 0; 
      
      points.push(new THREE.Vector3(x, y, z));
      for(let i=0; i<segments; i++) {
        x += (Math.random() - 0.5) * 1.5;
        y += (Math.random() - 0.2) * 1.5; 
        z += (Math.random() - 0.5) * 1.5;
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      return new THREE.TubeGeometry(curve, 8, 0.02, 4, false);
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Flicker effect
    groupRef.current.children.forEach((mesh) => {
      if (mesh instanceof THREE.Mesh && mesh.name === 'lightningBolt') {
        if (Math.random() > 0.94) {
          mesh.visible = true;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          const baseOpacity = 0.8 + Math.random() * 0.2;
          // Apply scroll opacity if it exists (defaults to 1 if not set yet)
          const scrollOpacity = mesh.userData.scrollOpacity !== undefined ? mesh.userData.scrollOpacity : 1;
          mat.opacity = baseOpacity * scrollOpacity;
          
          mesh.rotation.set(
              Math.random() * 0.5,
              Math.random() * Math.PI * 2,
              Math.random() * 0.5
          );
          mesh.scale.setScalar(0.8 + Math.random() * 0.4);
        } else {
          mesh.visible = false;
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {bolts.map((geometry, i) => (
        <mesh key={i} geometry={geometry} name="lightningBolt">
          <meshBasicMaterial 
            color="#aaddff" 
            transparent 
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Helper component to handle camera setup
const SceneSetup = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
};

function HammerModel() {
  const { scene } = useGLTF("/models/hammer.glb");
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { viewport } = useThree();
  const isMobile = viewport.width < 5; 

  // Setup materials
  useLayoutEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        mesh.material = new THREE.MeshStandardMaterial({
          map: oldMat.map,
          normalMap: oldMat.normalMap,
          roughnessMap: oldMat.roughnessMap,
          metalnessMap: oldMat.metalnessMap,
          color: oldMat.color,
          roughness: 0.4,
          metalness: 0.8,
          emissive: new THREE.Color("#2244ff"), 
          emissiveIntensity: 0.55, // Increased from 0.3
          transparent: true,
          opacity: 1,
        });
      }
    });
  }, [scene]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Idle animation: Slower
      meshRef.current.rotation.y += delta * 0.15;

      // Hover animation: Calmer
      const targetZ = hovered ? Math.sin(state.clock.elapsedTime * 2) * 0.02 : 0;
      const targetX = hovered ? Math.sin(state.clock.elapsedTime * 1.5) * 0.01 : 0;
      
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetZ, 0.05);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetX, 0.05);
    }
  });

  // Scroll Animation
  useEffect(() => {
    const el = meshRef.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      id: "hammer",
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top", 
      scrub: true,
      onUpdate: (self) => {
        // Move down less to avoid overlap
        // StartY logic needs to match the initial position logic below
        const startY = isMobile ? -1.5 : -0.5;
        el.position.y = startY - self.progress * 2.5; 
        
        // Scale
        const baseScale = isMobile ? 0.55 : 0.8;
        const targetScale = baseScale * (1 - self.progress * 0.1); // Less scaling
        el.scale.setScalar(targetScale);

        // Opacity - fade out faster
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            // Fade out completely by 70% scroll
            mat.opacity = Math.max(0, 1 - self.progress * 1.5);
          }
        });
        
        // Fade lightning too
        // (Lightning component handles its own opacity flickering, but we should fade it out globally via group or logic?
        // Since Lightning is in the group, we can't easily access its materials from here unless we traverse the group.
        // But the group `el` contains everything. We can traverse `el` instead of `scene`.
        el.traverse((child) => {
             if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine) {
                 const mat = (child as any).material;
                 if (mat && mat.transparent) {
                      // We need to preserve the base opacity logic of lightning flickering
                      // This is tricky. Let's just rely on the group moving away for now.
                      // Or actually, if we want lightning to fade, we need to pass a prop or context.
                 }
             }
             // For our specific Lightning implementation that uses userData.scrollOpacity:
             if (child.name === 'lightningBolt') {
                 child.userData.scrollOpacity = Math.max(0, 1 - self.progress * 1.5);
             }
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [scene, isMobile]);

  // Positioning: 
  // Desktop: Right side (x=2.2), Centered vertically (y=-0.5)
  // Mobile: Centered horizontally (x=0), Lower (y=-1.5)
  // Note: Viewport width at z=0 with fov 45 & dist 4 is approx 5.8 units (desktop 16:9).
  // x=2.2 keeps it comfortably on the right third without clipping.
  const position: [number, number, number] = isMobile 
    ? [0, -1.5, 0] 
    : [2.2, -0.5, 0];
    
  const scale = isMobile ? 0.55 : 0.8;

  return (
    <group ref={meshRef} position={position} scale={scale} rotation={[0.2, -0.5, 0]}>
      <primitive
        object={scene}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
      <Lightning />
    </group>
  );
}

const HammerScene = () => {
  const { setLoading } = useLoading();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let progress = setProgress((value) => setLoading(value));
    progress.loaded();
    
    const workTrigger = ScrollTrigger.getById("work");
    const hammerTrigger = ScrollTrigger.getById("hammer");
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger !== workTrigger && trigger !== hammerTrigger) {
        trigger.kill();
      }
    });

    setAllTimeline();
    setPageScrollAnimations();

    return () => {
      progress.clear();
    };
  }, [setLoading]);

  return (
    <div className="hammer-scene-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      zIndex: isMobile ? 1 : 11, 
      pointerEvents: 'none',
      overflow: 'visible'
    }}>
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        style={{ pointerEvents: 'auto' }}
        gl={{ alpha: true, antialias: true }}
      >
        <SceneSetup />
        <ambientLight intensity={0.6} /> 
        <directionalLight position={[0, 5, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[0, 1, 0]} color="#4488ff" intensity={6} distance={8} decay={1.5} />
        
        <HammerModel />
      </Canvas>
    </div>
  );
};

export default HammerScene;
